-- Previous admin actions updated only orders. Reconcile known COD bookkeeping
-- without changing order status, inventory, settled payments or gateway payments.
-- A historical collection time is unknown: preserve paid_at rather than invent it.
do $$
declare v_order orders%rowtype; v_payment payments%rowtype;
begin
  for v_order in select * from orders where payment_status in ('paid','cancelled') order by id for update loop
    select * into v_payment from payments where order_id=v_order.id order by created_at desc,id desc limit 1 for update;
    if found and v_payment.gateway_name='cash_on_delivery' and v_payment.payment_status='pending' then
      update payments set payment_status=v_order.payment_status where id=v_payment.id;
      insert into payment_events(payment_id,event_type,event_payload)
      values(v_payment.id,'migration.cod_status_reconciled',jsonb_build_object(
        'source','existing admin order payment status','previous_payment_status','pending',
        'payment_status',v_order.payment_status,'collection_time_unknown',true));
    end if;
  end loop;
end;
$$;
