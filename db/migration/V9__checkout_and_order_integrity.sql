-- Apply before deploying the application. Existing seven-argument callers remain compatible.
alter table orders add column stock_released boolean default false;
-- Historical cancelled orders need manual stock reconciliation; never guess adjustments.
update orders set stock_released = null where order_status = 'cancelled';

create table checkout_requests (
  request_id uuid primary key,
  payload jsonb not null,
  order_id uuid not null references orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table checkout_requests enable row level security;
revoke all on checkout_requests from public, anon, authenticated;

alter function create_checkout_order(text,text,text,text,text,text,jsonb)
  rename to create_checkout_order_internal;
revoke all on function create_checkout_order_internal(text,text,text,text,text,text,jsonb)
  from public, anon, authenticated, service_role;

create function create_checkout_order(
  p_customer_name text, p_customer_phone text, p_customer_district text,
  p_customer_address text, p_customer_note text, p_payment_method text, p_items jsonb,
  p_idempotency_key uuid default null, p_request_key text default null
)
returns table(order_id uuid, order_number text, tracking_token text, subtotal numeric,
  delivery_charge numeric, discount_amount numeric, total_amount numeric,
  payment_status text, order_status text, replayed boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_key uuid := coalesce(p_idempotency_key, gen_random_uuid());
  v_phone text := regexp_replace(p_customer_phone, '[^0-9]', '', 'g');
  v_items jsonb;
  v_payload jsonb;
  v_existing checkout_requests%rowtype;
  v_order_id uuid;
begin
  if length(coalesce(p_customer_note,'')) > 1000 then raise exception 'Order note is too long.'; end if;
  if length(v_phone) = 13 and left(v_phone,2) = '88' then v_phone := substr(v_phone,3); end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Invalid cart.' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    where product_id is null or quantity is null or quantity <> trunc(quantity) or quantity not between 1 and 99) then
    raise exception 'Invalid cart quantity.' using errcode = '22023';
  end if;
  -- Merge repeated product IDs and acquire product locks in a stable order.
  select jsonb_agg(jsonb_build_object('product_id', product_id, 'quantity', quantity) order by product_id)
    into v_items from (
      select product_id, sum(quantity) as quantity
      from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer) group by product_id
    ) grouped;
  v_payload := jsonb_build_array(trim(p_customer_name),v_phone,lower(trim(p_customer_district)),
    trim(p_customer_address),coalesce(trim(p_customer_note),''),p_payment_method,v_items);
  perform pg_advisory_xact_lock(hashtextextended(v_key::text, 0));
  select * into v_existing from checkout_requests where request_id = v_key;
  if found then
    if v_existing.payload <> v_payload then
      raise exception 'Checkout details changed. Start a new checkout.' using errcode = '22023';
    end if;
    return query select o.id,o.order_number,o.tracking_token,o.subtotal,o.delivery_charge,
      o.discount_amount,o.total_amount,o.payment_status,o.order_status,true
      from orders o where o.id = v_existing.order_id;
    return;
  end if;
  -- Limits are shared by all application instances and count accepted orders only.
  if record_public_rate_limit_hit('checkout-phone:' || v_phone,900) > 5 then
    raise exception 'Too many orders. Please wait 15 minutes or contact support.' using errcode = 'P0001';
  end if;
  if p_request_key is not null then
    if p_request_key !~ '^[0-9a-f]{64}$' then raise exception 'Invalid request key.'; end if;
    if record_public_rate_limit_hit('checkout-ip:' || p_request_key,900) > 30 then
      raise exception 'Too many orders. Please wait 15 minutes or contact support.' using errcode = 'P0001';
    end if;
  end if;
  select c.order_id into v_order_id from create_checkout_order_internal(
    p_customer_name,v_phone,p_customer_district,p_customer_address,p_customer_note,p_payment_method,v_items) c;
  insert into checkout_requests(request_id,payload,order_id) values(v_key,v_payload,v_order_id);
  return query select o.id,o.order_number,o.tracking_token,o.subtotal,o.delivery_charge,
    o.discount_amount,o.total_amount,o.payment_status,o.order_status,false from orders o where o.id = v_order_id;
end;
$$;
revoke all on function create_checkout_order(text,text,text,text,text,text,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function create_checkout_order(text,text,text,text,text,text,jsonb,uuid,text) to service_role;

create function reconcile_order_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_item record;
begin
  -- The marker is controlled here, including when a direct admin update is used.
  new.stock_released := old.stock_released;
  -- Dispatch cancellation is not evidence that the physical goods were returned.
  if new.order_status = 'cancelled' and old.order_status in ('shipped','delivered') then
    new.stock_released := null;
    return new;
  end if;
  if old.stock_released is null then
    if new.order_status is distinct from old.order_status then
      raise exception 'Cancelled order needs physical-stock reconciliation before reopening.';
    end if;
    return new;
  end if;
  if (new.order_status = 'cancelled' and not old.stock_released)
    or (new.order_status <> 'cancelled' and old.stock_released) then
    for v_item in select product_id,sum(quantity)::integer as quantity from order_items
      where order_id = old.id and product_id is not null group by product_id order by product_id loop
      if new.order_status = 'cancelled' then
        update products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id;
      else
        update products set stock_quantity = stock_quantity - v_item.quantity
          where id = v_item.product_id and stock_quantity >= v_item.quantity and is_active;
        if not found then raise exception 'Cannot reopen order: product unavailable or insufficient stock.'; end if;
      end if;
    end loop;
    if new.order_status <> 'cancelled' and exists(select 1 from order_items where order_id=old.id and product_id is null) then
      raise exception 'Cannot reopen order: a product has been deleted.';
    end if;
    new.stock_released := new.order_status = 'cancelled';
  end if;
  return new;
end;
$$;
revoke all on function reconcile_order_stock() from public,anon,authenticated;
create trigger reconcile_order_stock before update of order_status on orders
  for each row execute function reconcile_order_stock();

-- Explicit receipt/reconciliation: do not guess whether returned goods are sellable.
create function reconcile_cancelled_stock(p_order_number text,p_already_restocked boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_order orders%rowtype; v_item record; v_payment_id uuid;
begin
  if not is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_already_restocked is null then raise exception 'Confirm the physical inventory state.'; end if;
  select * into strict v_order from orders where order_number=p_order_number for update;
  if v_order.order_status <> 'cancelled' then raise exception 'Only cancelled orders can be reconciled.'; end if;
  if v_order.stock_released is true then return; end if;
  if not p_already_restocked then
    for v_item in select product_id,sum(quantity)::integer as quantity from order_items
      where order_id=v_order.id and product_id is not null group by product_id order by product_id loop
      update products set stock_quantity=stock_quantity+v_item.quantity where id=v_item.product_id;
    end loop;
  end if;
  update orders set stock_released=true where id=v_order.id;
  select id into strict v_payment_id from payments where order_id=v_order.id order by created_at desc,id desc limit 1;
  insert into payment_events(payment_id,event_type,event_payload) values(v_payment_id,'admin.stock_reconciled',
    jsonb_build_object('actor',auth.uid(),'already_restocked',p_already_restocked));
end;
$$;
revoke all on function reconcile_cancelled_stock(text,boolean) from public,anon;
grant execute on function reconcile_cancelled_stock(text,boolean) to authenticated;

create function update_admin_order(p_order_number text,p_order_status text,p_payment_status text)
returns void language plpgsql security definer set search_path=public as $$
declare v_order orders%rowtype; v_payment payments%rowtype;
begin
  if not is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_order_status not in ('pending','confirmed','processing','shipped','delivered','cancelled')
    or p_payment_status not in ('pending','paid','failed','cancelled','refunded') then raise exception 'Invalid status.'; end if;
  select * into strict v_order from orders where order_number=p_order_number for update;
  select * into strict v_payment from payments where order_id=v_order.id order by created_at desc,id desc limit 1 for update;
  if (v_payment.payment_status in ('paid','refunded') or v_order.payment_status in ('paid','refunded'))
    and p_payment_status not in ('paid','refunded') then
    raise exception 'A settled payment cannot be changed to pending, failed or cancelled.';
  end if;
  if (v_payment.payment_status = 'refunded' or v_order.payment_status = 'refunded') and p_payment_status <> 'refunded' then
    raise exception 'A refunded payment cannot be marked paid again.';
  end if;
  update orders set order_status=p_order_status,payment_status=p_payment_status where id=v_order.id;
  update payments set payment_status=p_payment_status,
    paid_at=case when p_payment_status='paid' then coalesce(paid_at,now()) else paid_at end where id=v_payment.id;
  if v_order.order_status is distinct from p_order_status or v_payment.payment_status is distinct from p_payment_status then
    insert into payment_events(payment_id,event_type,event_payload) values(v_payment.id,'admin.order_updated',
      jsonb_build_object('actor',auth.uid(),'previous_order_status',v_order.order_status,'order_status',p_order_status,
        'previous_payment_status',v_payment.payment_status,'payment_status',p_payment_status));
  end if;
end;
$$;
revoke all on function update_admin_order(text,text,text) from public,anon;
grant execute on function update_admin_order(text,text,text) to authenticated;

-- Gateway validation stays in trusted server code; this RPC commits its verified result atomically.
create function apply_verified_payment(p_payment_id uuid,p_status text,p_transaction_id text,p_method text,p_response jsonb)
returns text language plpgsql security definer set search_path=public as $$
declare v_order_id uuid; v_order orders%rowtype; v_payment payments%rowtype;
begin
  if p_status not in ('paid','failed','cancelled') then raise exception 'Invalid verified status.'; end if;
  select order_id into strict v_order_id from payments where id=p_payment_id;
  select * into strict v_order from orders where id=v_order_id for update;
  select * into strict v_payment from payments where id=p_payment_id for update;
  if v_payment.gateway_name <> 'sslcommerz' then raise exception 'Unexpected payment provider.'; end if;
  if v_payment.payment_status='refunded' or v_order.payment_status='refunded' then return 'refunded'; end if;
  if (v_payment.payment_status='paid' or v_order.payment_status='paid') and p_status<>'paid' then
    return 'paid';
  end if;
  update payments set payment_status=p_status,gateway_transaction_id=p_transaction_id,
    payment_method=p_method,gateway_response=p_response,
    paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end where id=p_payment_id;
  update orders set payment_status=p_status where id=v_order_id;
  if v_payment.payment_status is distinct from p_status then
    insert into payment_events(payment_id,event_type,event_payload)
      values(p_payment_id,'sslcommerz.status_updated',jsonb_build_object('payment_status',p_status,'response',p_response));
  end if;
  return p_status;
end;
$$;
revoke all on function apply_verified_payment(uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function apply_verified_payment(uuid,text,text,text,jsonb) to service_role;
