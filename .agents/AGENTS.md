# Workspace-Scoped Agent Rules

- **Modular UI Dashboard Sub-views**: Never build large, consolidated dashboard page files containing multiple distinct sub-views, tabs, or sidebar sections. Each distinct sidebar section, tab, or sub-view must be decoupled into its own separate file under the same directory (or a subcomponent directory) and imported into the parent dashboard layout. This maintains visual structure, decoupling, and code readability, matching the architecture utilized for the Admin dashboard views.
