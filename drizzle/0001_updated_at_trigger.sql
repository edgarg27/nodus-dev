create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_usuario_updated_at before update on usuario
  for each row execute function set_updated_at();

create trigger trg_propiedad_updated_at before update on propiedad
  for each row execute function set_updated_at();
