-- Ilan Dashboard: TRUNCATE slaat de rij-regels (RLS) over. De app heeft alleen lezen, toevoegen, wijzigen en verwijderen nodig.
revoke truncate, references, trigger on
  public.todos, public.dashboard_settings, public.notes, public.bills, public.wishlist, public.bookmakers, public.bets
from anon, authenticated;
