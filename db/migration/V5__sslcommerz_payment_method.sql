create or replace function create_checkout_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_district text,
  p_customer_address text,
  p_customer_note text,
  p_payment_method text,
  p_items jsonb
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  delivery_charge numeric,
  discount_amount numeric,
  total_amount numeric,
  payment_status text,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_subtotal numeric(12, 2) := 0;
  v_delivery_charge numeric(12, 2) := 80;
  v_discount_amount numeric(12, 2) := 0;
  v_total_amount numeric(12, 2);
  v_payment_method text := lower(trim(coalesce(p_payment_method, 'cash-on-delivery')));
  v_gateway_name text;
  v_item record;
  v_product record;
  v_unit_price numeric(12, 2);
  v_line_total numeric(12, 2);
  v_item_count integer;
begin
  if v_payment_method = 'payment-gateway' then
    v_payment_method := 'sslcommerz';
  end if;

  if v_payment_method not in ('cash-on-delivery', 'sslcommerz') then
    raise exception 'Unsupported payment method.' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Customer name is required.' using errcode = '22023';
  end if;

  if trim(coalesce(p_customer_phone, '')) !~ '^(?:\+?88)?01[3-9][0-9]{8}$' then
    raise exception 'A valid Bangladesh mobile number is required.' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_customer_district, ''))) < 2 then
    raise exception 'Customer district is required.' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_customer_address, ''))) < 8 then
    raise exception 'Customer address is required.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Cart items must be an array.' using errcode = '22023';
  end if;

  select count(*) into v_item_count from jsonb_array_elements(p_items);

  if v_item_count < 1 then
    raise exception 'Cart is empty.' using errcode = '22023';
  end if;

  if v_item_count > 30 then
    raise exception 'Cart has too many line items.' using errcode = '22023';
  end if;

  for v_item in
    select product_id, quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  loop
    if v_item.product_id is null then
      raise exception 'Cart item product id is required.' using errcode = '22023';
    end if;

    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'Invalid quantity for a cart item.' using errcode = '22023';
    end if;

    select id, name, price, discount_price, stock_quantity, is_active
    into v_product
    from products
    where id = v_item.product_id
    for update;

    if not found or v_product.is_active is not true then
      raise exception 'A product in your cart is no longer available.' using errcode = '22023';
    end if;

    if v_product.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for %.', v_product.name using errcode = '22023';
    end if;

    v_unit_price := coalesce(v_product.discount_price, v_product.price);
    v_line_total := round(v_unit_price * v_item.quantity, 2);
    v_subtotal := round(v_subtotal + v_line_total, 2);
  end loop;

  v_total_amount := round(v_subtotal + v_delivery_charge - v_discount_amount, 2);
  v_order_number := 'SP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_number_seq')::text, 6, '0');
  v_gateway_name := case
    when v_payment_method = 'cash-on-delivery' then 'cash_on_delivery'
    when v_payment_method = 'sslcommerz' then 'sslcommerz'
    else 'unknown'
  end;

  insert into orders (
    id,
    order_number,
    customer_name,
    customer_phone,
    customer_district,
    customer_address,
    customer_note,
    subtotal,
    delivery_charge,
    discount_amount,
    total_amount,
    order_status,
    payment_status
  ) values (
    v_order_id,
    v_order_number,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_customer_district),
    trim(p_customer_address),
    nullif(trim(coalesce(p_customer_note, '')), ''),
    v_subtotal,
    v_delivery_charge,
    v_discount_amount,
    v_total_amount,
    'pending',
    'pending'
  );

  for v_item in
    select product_id, quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  loop
    select id, name, price, discount_price, stock_quantity
    into v_product
    from products
    where id = v_item.product_id
    for update;

    v_unit_price := coalesce(v_product.discount_price, v_product.price);
    v_line_total := round(v_unit_price * v_item.quantity, 2);

    insert into order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      total_price
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_unit_price,
      v_item.quantity,
      v_line_total
    );

    update products
    set stock_quantity = stock_quantity - v_item.quantity
    where id = v_product.id;
  end loop;

  insert into payments (
    order_id,
    gateway_name,
    gateway_transaction_id,
    amount,
    currency,
    payment_method,
    payment_status
  ) values (
    v_order_id,
    v_gateway_name,
    case when v_payment_method = 'sslcommerz' then v_order_number else null end,
    v_total_amount,
    'BDT',
    v_payment_method,
    'pending'
  );

  return query
  select
    v_order_id,
    v_order_number,
    v_subtotal,
    v_delivery_charge,
    v_discount_amount,
    v_total_amount,
    'pending'::text,
    'pending'::text;
end;
$$;

revoke all on function create_checkout_order(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function create_checkout_order(text, text, text, text, text, text, jsonb) to service_role;
