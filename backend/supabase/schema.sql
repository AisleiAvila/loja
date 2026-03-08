create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  short_description text not null,
  description text not null,
  price numeric(10, 2) not null,
  compare_at_price numeric(10, 2),
  images text[] not null default '{}',
  video_url text,
  benefits text[] not null default '{}',
  featured boolean not null default false,
  badge text
);

create table if not exists public.site_content (
  id text primary key,
  brand jsonb not null,
  about jsonb not null,
  contact jsonb not null
);

create table if not exists public.orders (
  id text primary key,
  product_id text not null references public.products(id) on delete restrict,
  quantity integer not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  postal_code text not null,
  city text not null,
  payment_method text not null,
  notes text,
  product_name text not null,
  total numeric(10, 2) not null,
  status text not null,
  created_at timestamptz not null default now(),
  payment_provider text,
  payment_reference text,
  payment_url text
);

insert into public.site_content (id, brand, about, contact)
values (
  'default',
  '{"name":"Luz do Atlântico","tagline":"Objetos sensoriais para casa e rotina","headline":"Uma coleção portuguesa com assinatura visual limpa, checkout rápido e operação pronta para produção.","heroVideoUrl":"","heroPosterUrl":"/brand/hero-poster.svg"}'::jsonb,
  '{"story":"A Luz do Atlântico nasceu entre Lisboa e a costa oeste, com a ideia de vender poucos produtos, mas apresentá-los com a disciplina visual de uma marca editorial.","mission":"Aproximar design de produto, rotina e compra direta num site rápido, claro e preparado para campanhas de performance.","values":["Clareza na comunicação","Performance em mobile","Materiais e imagem com percepção premium"]}'::jsonb,
  '{"email":"ola@luzdoatlantico.pt","phone":"+351 214 880 220","address":"Rua Nova do Carvalho 18, 1200-292 Lisboa","whatsapp":"+351214880220"}'::jsonb
)
on conflict (id) do nothing;
