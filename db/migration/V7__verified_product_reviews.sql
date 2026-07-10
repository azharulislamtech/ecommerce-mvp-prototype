create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  rating smallint not null,
  title text,
  body text not null,
  reviewer_label text not null default 'Verified customer',
  verified_purchase boolean not null default true,
  status text not null default 'pending',
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_rating_range check (rating between 1 and 5),
  constraint product_reviews_title_length check (title is null or char_length(title) between 3 and 120),
  constraint product_reviews_body_length check (char_length(body) between 20 and 1500),
  constraint product_reviews_status_valid check (status in ('pending', 'approved', 'rejected')),
  constraint product_reviews_one_per_order_product unique (order_id, product_id)
);

create index if not exists idx_product_reviews_public on product_reviews (product_id, created_at desc)
where status = 'approved';
create index if not exists idx_product_reviews_moderation on product_reviews (status, created_at asc);

drop trigger if exists set_product_reviews_updated_at on product_reviews;
create trigger set_product_reviews_updated_at
before update on product_reviews
for each row execute function set_updated_at();

alter table product_reviews enable row level security;

drop policy if exists "Admins can manage product reviews" on product_reviews;
create policy "Admins can manage product reviews"
on product_reviews
for all
to authenticated
using (is_admin())
with check (is_admin());

create or replace function get_product_review_summary(p_product_id uuid)
returns table (
  review_count bigint,
  average_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as review_count,
    round(avg(rating)::numeric, 1) as average_rating
  from product_reviews
  where product_id = p_product_id
    and status = 'approved';
$$;

create or replace function get_public_product_reviews(p_product_id uuid)
returns table (
  id uuid,
  rating smallint,
  title text,
  body text,
  reviewer_label text,
  verified_purchase boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    id,
    rating,
    title,
    body,
    reviewer_label,
    verified_purchase,
    created_at
  from product_reviews
  where product_id = p_product_id
    and status = 'approved'
  order by created_at desc
  limit 50;
$$;

create or replace function submit_verified_product_review(
  p_product_id uuid,
  p_order_number text,
  p_customer_phone text,
  p_rating smallint,
  p_title text,
  p_body text
)
returns table (
  review_id uuid,
  review_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g');
  v_existing_review_id uuid;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_body text := trim(coalesce(p_body, ''));
begin
  if left(v_phone, 2) = '88' and char_length(v_phone) = 13 then
    v_phone := right(v_phone, 11);
  end if;

  if p_product_id is null
    or upper(trim(coalesce(p_order_number, ''))) !~ '^[A-Z0-9-]{6,64}$'
    or v_phone !~ '^01[3-9][0-9]{8}$'
    or p_rating not between 1 and 5
    or (v_title is not null and char_length(v_title) not between 3 and 120)
    or char_length(v_body) not between 20 and 1500 then
    raise exception 'Invalid review submission.' using errcode = '22023';
  end if;

  select * into v_order
  from orders
  where upper(order_number) = upper(trim(p_order_number))
    and order_status = 'delivered'
    and (
      case
        when regexp_replace(customer_phone, '\D', '', 'g') ~ '^88[0-9]{11}$'
          then right(regexp_replace(customer_phone, '\D', '', 'g'), 11)
        else regexp_replace(customer_phone, '\D', '', 'g')
      end
    ) = v_phone;

  if not found then
    raise exception 'Order could not be verified for a review.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from order_items
    where order_id = v_order.id
      and product_id = p_product_id
  ) then
    raise exception 'This product was not found in the verified order.' using errcode = '22023';
  end if;

  insert into product_reviews (
    product_id,
    order_id,
    rating,
    title,
    body,
    reviewer_label,
    verified_purchase,
    status,
    moderated_at
  ) values (
    p_product_id,
    v_order.id,
    p_rating,
    v_title,
    v_body,
    'Verified customer',
    true,
    'pending',
    null
  )
  on conflict (order_id, product_id) do update
  set
    rating = excluded.rating,
    title = excluded.title,
    body = excluded.body,
    status = 'pending',
    moderated_at = null
  returning id into v_existing_review_id;

  return query select v_existing_review_id, 'pending'::text;
end;
$$;

revoke all on function get_product_review_summary(uuid) from public;
revoke all on function get_public_product_reviews(uuid) from public;
revoke all on function submit_verified_product_review(uuid, text, text, smallint, text, text) from public, anon, authenticated;
grant execute on function get_product_review_summary(uuid) to anon, authenticated;
grant execute on function get_public_product_reviews(uuid) to anon, authenticated;
grant execute on function submit_verified_product_review(uuid, text, text, smallint, text, text) to service_role;
