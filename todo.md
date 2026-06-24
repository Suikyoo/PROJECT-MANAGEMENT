
$env:COPILOT_PROVIDER_TYPE="anthropic"
$env:COPILOT_PROVIDER_BASE_URL="https://api.deepseek.com/anthropic"
$env:COPILOT_PROVIDER_API_KEY="sk-9daa55a516db4f8abdfe705d2c08487f"
$env:COPILOT_MODEL="deepseek-v4-pro"

## Cubeworks Project Manager
- User page to change password: (done)
- Forgot Password mechanism: (done)
- Google login integration: (done)
- optimize the loading of boards. make it drop-down-able per phase (done)
- resizable inside-div width for timeline (make it stretchable) (done)
- imitate figma (done)

## Cubeworks Orbit
- User page to change password (goods)
- Forgot Password mechanism (goods)
- Google login integration (goods) 

- ftr: Issues tab with different types
- ftr: users can have multiple roles
- ftr: Draggable ordering in board view
- ftr: Jam Integration
- ftr: Search/Filter tasks
- ftr: add an urgency system with notif. have a stat or chart about what the missed and also urgent tasks are
- fix: Make the initial max-height of boardview responsive (%) (done): just fixed pixels


---
ISSUES
---

fixed: oauth not configured
fixed: multiple account roles as not properly changed in frontend. admin page and even insider assume that roles are singular and fixed. 

fixed: user page still shows alex (mock data) for frontend

fixed: oauth not configured error

fixed: resolution can't be created by supervisors for some reason

fixed: issue and resolution links somehow resolve to localhost instead of the submitted link from the creation form 

fixed: issueView shouldnt have a forward resolution button -> resolution creation form. if user is supervisor role, display resolution creation form directly


feature: / (insider) api routes merged with /token (client) routes

backlog: there is a notification component in User Page as well as some info not included in the database :: **it may be used for a feature so i'm not deleting it yet"
---
fix: resolution still does not show even for supervisor roles

fixed (reviewed): since the frontend only receives a user with the roles: Role[] after being transformed by the backend, delete the role field of userTable in the database. Only rely on the join of the userRoleTable :: admin's user page is not updated with the new mechanism of multi-roles with no primary role.

done (reviewed): for ProjectView.tsx that is inside ProjectLayout.tsx, make them only fit the remaining area of the screen and just use overflow-y-scroll.

done (reviewed): delete the old role toggle component in admin page

done (reviewed): For those comment sections in frontend. Use the author name (tokenId.name for clients and user.name for users). Make the comment author names clickable, wherein they get taken into a user page (repurpose the user page to take in any user with a user id param (insider/users/:user_id). 

done (reviewed): create a log history (just like a messaging conversation app) of the back and forth between issue and resolution. Put it on the issueView.tsx

fix (to review): In IssueList.tsx, put the unresolved issues at the top


ftr: supervisor can advance-assign to developers
ftr: project manager between supervisor and developer
ftr: auto-assign to developers using AI
ftr: calendar tab
ftr: hierarchical project log use .md to generate a heading hierarchy, that is clickable
ftr: daily task comments
ftr: comment pagination
ftr: add teams
ftr: put checkbox for selected tasks, to mass approve from in-progress -> under review -> qa approved -> complete

fix: daily email add project name
fix: tag not working come on
fix: issue scrolling
fix: clickable urgency tasks
fix: add name of the one who forwarded the issue or resolution (probably in actions)
fix: issue with delete token

