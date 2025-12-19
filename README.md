# api.dombesteindata.net
### Folder Structure:
This repo is configured in the following way:

Everything relevant to the API lives within /src. All other files are just config files or this README.

Within /src, the main file that runs everything is index.js. This file checks the incoming request, and validates the provided endpoint path. If this path is not valid, it errors out.

The main script for sending emails (currently the only function finished on this API endpoint) lives within /routes/v1/contact/send.js. This file handles everything required to parse the data coming from the contact form on the website, to sending it as an email via the Resend API.
This file also uses some helper funcitons which are within /src/lib. These functions are mainly just helpers to ensure everything is validated and passed on properly.

Repo will be made private after exam has been graded.