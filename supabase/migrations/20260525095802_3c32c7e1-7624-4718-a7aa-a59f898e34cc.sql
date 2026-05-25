
-- Roles enum and table
create type public.app_role as enum ('admin','doctor','patient');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  specialization text not null,
  bio text,
  consultation_fee numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.doctors enable row level security;

create table public.doctor_schedules (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);
alter table public.doctor_schedules enable row level security;

create type public.appointment_status as enum ('pending','confirmed','completed','cancelled');

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  reason text,
  status appointment_status not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
create index on public.appointments(doctor_id, appointment_date);
create index on public.appointments(patient_id);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  diagnosis text not null,
  prescription text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.medical_records enable row level security;

-- Trigger to create profile + default patient role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone');
  insert into public.user_roles (user_id, role) values (new.id, 'patient');
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS policies
-- profiles
create policy "users view own profile" on public.profiles for select using (auth.uid()=id);
create policy "admins view all profiles" on public.profiles for select using (public.has_role(auth.uid(),'admin'));
create policy "doctors view patient profiles via appts" on public.profiles for select using (
  public.has_role(auth.uid(),'doctor') and exists (
    select 1 from public.appointments a join public.doctors d on d.id=a.doctor_id
    where a.patient_id=profiles.id and d.user_id=auth.uid()
  )
);
create policy "users update own profile" on public.profiles for update using (auth.uid()=id);

-- user_roles
create policy "users view own roles" on public.user_roles for select using (auth.uid()=user_id);
create policy "admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- doctors (public read for any authenticated)
create policy "authenticated view doctors" on public.doctors for select to authenticated using (true);
create policy "admins manage doctors" on public.doctors for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "doctor updates own" on public.doctors for update using (user_id=auth.uid());

-- doctor_schedules
create policy "authenticated view schedules" on public.doctor_schedules for select to authenticated using (true);
create policy "admins manage schedules" on public.doctor_schedules for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "doctor manages own schedules" on public.doctor_schedules for all using (
  exists (select 1 from public.doctors d where d.id=doctor_schedules.doctor_id and d.user_id=auth.uid())
) with check (
  exists (select 1 from public.doctors d where d.id=doctor_schedules.doctor_id and d.user_id=auth.uid())
);

-- appointments
create policy "patient views own appts" on public.appointments for select using (patient_id=auth.uid());
create policy "doctor views own appts" on public.appointments for select using (
  exists (select 1 from public.doctors d where d.id=appointments.doctor_id and d.user_id=auth.uid())
);
create policy "admin views all appts" on public.appointments for select using (public.has_role(auth.uid(),'admin'));
create policy "patient creates own appts" on public.appointments for insert with check (patient_id=auth.uid() and public.has_role(auth.uid(),'patient'));
create policy "patient cancels own appts" on public.appointments for update using (patient_id=auth.uid()) with check (patient_id=auth.uid());
create policy "doctor updates own appts" on public.appointments for update using (
  exists (select 1 from public.doctors d where d.id=appointments.doctor_id and d.user_id=auth.uid())
);
create policy "admin manages appts" on public.appointments for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- medical_records
create policy "patient views own records" on public.medical_records for select using (patient_id=auth.uid());
create policy "doctor views own records" on public.medical_records for select using (
  exists (select 1 from public.doctors d where d.id=medical_records.doctor_id and d.user_id=auth.uid())
);
create policy "admin views all records" on public.medical_records for select using (public.has_role(auth.uid(),'admin'));
create policy "doctor creates records" on public.medical_records for insert with check (
  exists (select 1 from public.doctors d where d.id=medical_records.doctor_id and d.user_id=auth.uid())
);
create policy "admin manages records" on public.medical_records for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
