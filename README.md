# Community Evacuation Center Management System: Landing Page 

CSC 106 project by **InnovaTech** (Caraga State University, CCIS).
The website shows live evacuation center status and announcements from a **Google Sheet**,
and saves volunteer sign-ups back into it. It is hosted for free on **Vercel**.

It works right away with sample data. Connecting the Google Sheet takes about 10 minutes.

---

## Step 1: Upload to GitHub

1. Go to https://github.com/new, name the repository `evacuation-center-system`, and click **Create repository**.
2. Click **uploading an existing file**.
3. Open the `evacuation-center-system` folder on your computer, select **everything inside it**,
   and drag it into the GitHub page:

   ```
   api/
   google-apps-script/
   lib/
   public/
   sheet-template/
   .env.example
   .gitignore
   dev-server.js
   package.json
   README.md
   vercel.json
   ```
   Upload the **contents** of the folder, not the folder itself. `package.json` must be at the
   top level of the repository.
4. Click **Commit changes**.

## Step 2: Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub.
2. Click **Add New > Project**, then **Import** your `evacuation-center-system` repository.
3. Leave all settings as they are and click **Deploy**.

Your site is now live, showing **sample data**. The next steps connect your real Google Sheet.

## Step 3: Create the Google Sheet

1. Go to https://sheets.new to create a blank sheet.
2. Make 4 tabs, named exactly: `Centers`, `Announcements`, `Volunteers`, `Evacuees`.
3. In each tab, go to **File > Import > Upload**, choose the matching file from the `sheet-template`
   folder, and select **Replace current sheet**.

## Step 4: Add the script to the sheet

1. In the Google Sheet, click **Extensions > Apps Script**.
2. Delete the code already there, then paste in everything from `google-apps-script/Code.gs`. Click **Save**.
3. Click **Deploy > New deployment**. Click the gear icon and choose **Web app**.
4. Set **Execute as: Me** and **Who has access: Anyone**. Click **Deploy**.
5. Google will ask for permission: click **Authorize access** and choose your account.
   If you see "Google hasn't verified this app", click **Advanced > Go to (project name)**,
   then **Allow**. This is normal for your own scripts.
6. Copy the **Web app URL** (it ends in `/exec`).

## Step 5: Connect the sheet to Vercel

1. In Vercel, open your project and go to **Settings > Environment Variables**.
2. Add one variable:
   - **Key:** `SHEET_API_URL`
   - **Value:** the Web app URL you copied
3. Go to **Deployments**, click the **⋯** menu on the latest deployment, and choose **Redeploy**.

Done. The board on your site now says **Live** instead of **Sample data**.

---

## Updating the data

Edit the Google Sheet. The website picks up changes within about a minute.

- **Centers:** change `occupancy` as people arrive. Status is automatic: below 80% full is Open,
  80% or more is Nearly Full, and 100% is Full. Type `Closed` in `status_override` to close a center.
- **Announcements:** set `priority` to `urgent`, `warning` or `info`. Set `active` to `no` to hide one.
  An `urgent` announcement also appears as a red banner at the top of the site.
- **Volunteers:** new sign-ups appear here automatically.
- **Evacuees:** private. The website never reads this tab.

**Optional:** to count occupancy automatically from the Evacuees tab, put this formula in
`Centers` cell `E2` and drag it down:

```
=COUNTIFS(Evacuees!G:G, A2, Evacuees!I:I, "Sheltered")
```

## If you change the script later

In Apps Script, go to **Deploy > Manage deployments**, click the pencil icon, set **Version: New version**,
and click **Deploy**. This keeps the same URL, so you don't need to change anything in Vercel.

## Run it on your computer (optional)

Install Node.js 18 or newer, open a terminal in this folder, and run `npm run dev`.
Then open http://localhost:3000. To use your real sheet locally, copy `.env.example` to `.env`
and paste in your Web app URL.

## Troubleshooting

| Problem | Fix |
|---|---|
| Still says "Sample data" | You added `SHEET_API_URL` but didn't redeploy. Do Step 5.3. |
| "Could not load evacuation data" | Make sure the Apps Script deployment is set to **Who has access: Anyone**, and the tab names match exactly. |
| Volunteer form shows an error | Make sure the `Volunteers` tab exists and its name is spelled exactly. |

## Project files

| Path | What it is |
|---|---|
| `public/` | The website: `index.html`, `styles.css`, `app.js` |
| `api/` | Server code Vercel runs: `status.js` reads the sheet, `volunteer.js` saves sign-ups |
| `lib/` | Shared code: sheet connection, status rules, sample data |
| `google-apps-script/Code.gs` | Script you paste into the Google Sheet |
| `sheet-template/` | Starting data for the 4 sheet tabs |
| `dev-server.js` | Runs the site on your computer |
