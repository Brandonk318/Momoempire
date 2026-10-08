# Cloudflare-2 frontend build and preview

Frontend is Create React App via CRACO. The build script is `craco build`, output is `frontend/build`, and Cloudflare Pages serves that directory. The backend API origin is compiled into `REACT_APP_BACKEND_URL` during build.

A frontend lockfile was not found. Generate and commit one before enforcing frozen installs. Two platform-specific frontend development dependencies remain and must be reviewed for portability. A fresh build and preview deploy have not been executed. Do not enable automatic deployments or paid CI without approval.
