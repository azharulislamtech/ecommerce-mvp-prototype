-- Integration checks on real Supabase roles/functions. Every change is rolled back.
begin;
do $$
declare v_admin uuid;
begin
  select user_id into strict v_admin from admin_users where is_active order by created_at limit 1;
  perform set_config('request.jwt.claim.sub',v_admin::text,true);
end;
$$;
set local role authenticated;
do $$
declare v_product uuid := gen_random_uuid();
begin
  if not is_admin() then raise exception 'Existing admin authorization failed.'; end if;
  insert into products(id,name,slug,price,stock_quantity,is_active)
    values(v_product,'Rolled-back release check','release-'||v_product::text,100,10,true);
  update products set price=110,is_active=false where id=v_product;
  if not exists(select 1 from products where id=v_product and price=110 and not is_active) then
    raise exception 'Authenticated admin product RLS update failed.';
  end if;
  delete from products where id=v_product;
end;
$$;
reset role;
set local role service_role;
do $$
declare v_product products%rowtype; v_first record; v_retry record; v_key uuid:=gen_random_uuid();
begin
  select * into strict v_product from products where is_active and stock_quantity>=1 order by id limit 1 for update;
  select * into v_first from create_checkout_order('Rolled-back release check','01700000000','Dhaka',
    'Integration verification only','','cash-on-delivery',jsonb_build_array(jsonb_build_object('product_id',v_product.id,'quantity',1)),v_key,null);
  select * into v_retry from create_checkout_order('Rolled-back release check','01700000000','Dhaka',
    'Integration verification only','','cash-on-delivery',jsonb_build_array(jsonb_build_object('product_id',v_product.id,'quantity',1)),v_key,null);
  if v_first.order_id<>v_retry.order_id or not v_retry.replayed
    or v_first.total_amount<>coalesce(v_product.discount_price,v_product.price)+60
    or (select stock_quantity from products where id=v_product.id)<>v_product.stock_quantity-1 then
    raise exception 'Supabase checkout amount, idempotency or inventory failed.';
  end if;
  perform set_config('release.order_number',v_first.order_number,true);
  perform set_config('release.product_id',v_product.id::text,true);
  perform set_config('release.initial_stock',v_product.stock_quantity::text,true);
end;
$$;
reset role;
set local role authenticated;
do $$
declare v_number text:=current_setting('release.order_number'); v_product uuid:=current_setting('release.product_id')::uuid;
  v_initial integer:=current_setting('release.initial_stock')::integer;
begin
  perform update_admin_order(v_number,'cancelled','cancelled');
  perform update_admin_order(v_number,'cancelled','cancelled');
  if (select stock_quantity from products where id=v_product)<>v_initial then raise exception 'Repeated cancellation stock failed.'; end if;
  perform update_admin_order(v_number,'confirmed','pending');
  perform update_admin_order(v_number,'delivered','paid');
  if exists(select 1 from orders o join payments p on p.order_id=o.id where o.order_number=v_number
    and (o.payment_status<>'paid' or p.payment_status<>'paid')) then raise exception 'Admin settlement consistency failed.'; end if;
  begin
    perform update_admin_order(v_number,'delivered','pending');
    raise exception 'Settled payment downgrade was accepted.' using errcode='22023';
  exception when raise_exception then
    null; -- Expected P0001 rejection; the custom failure above uses a different code.
  end;
end;
$$;
reset role;
rollback;
select 'Real Supabase admin RLS CRUD, COD amount/idempotency/stock and settlement checks passed; all test changes rolled back.';
