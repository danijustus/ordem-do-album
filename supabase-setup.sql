-- ============================================================
--  Ordem do Álbum — configuração do banco de dados
--  Cole tudo isto no Supabase: menu "SQL Editor" > New query > Run
-- ============================================================

-- Tabela de projetos (cada álbum/cliente)
create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  token text not null unique,
  status text not null default 'aberto',          -- 'aberto' | 'aprovado'
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz
);

-- Tabela de fotos
create table if not exists fotos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  storage_path text not null,
  nome_original text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists fotos_projeto_idx on fotos (projeto_id, ordem);

-- Segurança: liga o RLS e NÃO cria nenhuma política pública.
-- Resultado: o acesso anônimo (navegador) não enxerga nenhuma linha.
-- Só o nosso servidor (chave service_role) acessa os dados — ele ignora o RLS.
-- Isso impede que alguém liste os tokens/links das clientes pela API pública.
alter table projetos enable row level security;
alter table fotos enable row level security;

-- Bucket de armazenamento das fotos (público para exibir miniaturas).
-- Os caminhos têm parte aleatória, então não são adivinháveis.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;
