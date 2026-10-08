<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
# AGENTS

- Admin access in RLS uses public.is_admin() (reads profiles.role for auth.uid()); never check auth.jwt() role — the JWT carries no admin claim.
- Public spot theme overrides must be scoped to `.sz` and ancestors selected with `:has(.sz)`; this isolates page backgrounds and shared UI tokens from the admin, with dark mode controlled only by `html.dark`.
