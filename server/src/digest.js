/* digest.js — the weekly ballot-box readout (audit §Phase 1): what the
 * community voted for and proposed this week, as markdown. Stored in D1
 * (served at /api/workshop/digest/latest) and, when GITHUB_TOKEN +
 * GITHUB_REPO are configured, posted as a GitHub Discussion so the
 * community sees what the community wants without opening the game. */

import { now } from "./util.js";

const WEEK = 7 * 864e5;

export async function buildAndPostDigest(env) {
  const since = now() - WEEK;

  const [votes, props, voters] = await Promise.all([
    env.DB.prepare(
      `SELECT subject, field, choice, COUNT(*) AS n FROM workshop_votes
       WHERE updated_at >= ? GROUP BY subject, field, choice
       ORDER BY n DESC LIMIT 25`).bind(since).all(),
    env.DB.prepare(
      `SELECT p.id, p.subject, p.kind, p.title, u.username,
              (SELECT COUNT(*) FROM endorsements e WHERE e.proposal_id = p.id) AS endorsements
       FROM proposals p JOIN users u ON u.id = p.user_id
       WHERE p.created_at >= ? AND p.status = 'open'
       ORDER BY endorsements DESC LIMIT 25`).bind(since).all(),
    env.DB.prepare(
      "SELECT COUNT(DISTINCT user_id) AS n FROM workshop_votes WHERE updated_at >= ?"
    ).bind(since).first(),
  ]);

  const date = new Date(now()).toISOString().slice(0, 10);
  let md = `# Workshop digest — week ending ${date}\n\n`;
  md += `*Auto-generated from the in-game workshop. ${voters?.n || 0} players voted this week. `;
  md += `Votes inform curation — they don't auto-apply (see GOVERNANCE.md).*\n\n`;

  md += `## Most-supported votes this week\n\n`;
  if (!votes.results.length) md += `A quiet week — no new votes.\n`;
  else {
    md += `| Object | Question | Community's pick | Votes |\n|---|---|---|---|\n`;
    for (const v of votes.results) {
      const choice = v.choice.length > 60 ? v.choice.slice(0, 57) + "…" : v.choice;
      md += `| \`${v.subject}\` | ${v.field} | ${choice.replace(/\|/g, "\\|")} | ${v.n} |\n`;
    }
  }

  md += `\n## New proposals\n\n`;
  if (!props.results.length) md += `None this week — submit one from any object's Edit panel in-game.\n`;
  else for (const p of props.results)
    md += `- **${p.title}** (\`${p.subject}\`, ${p.kind}) by ${p.username} — ${p.endorsements} endorsements\n`;

  md += `\nEvery proposal is granted CC BY-SA 4.0 / GPL-3.0-or-later at submission, `;
  md += `so accepted work belongs to everyone, forever.\n`;

  let postedUrl = null;
  if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
    try { postedUrl = await postDiscussion(env, `Workshop digest — ${date}`, md); }
    catch (e) { console.log("digest: discussion post failed:", e); }
  }
  await env.DB.prepare("INSERT INTO digests (created_at, markdown, posted_url) VALUES (?,?,?)")
    .bind(now(), md, postedUrl).run();
  return { md, postedUrl };
}

/* GitHub Discussions is GraphQL-only. Category defaults to "Announcements"
 * unless DIGEST_CATEGORY names another. */
async function postDiscussion(env, title, body) {
  const [owner, name] = env.GITHUB_REPO.split("/");
  const gql = async (query, variables) => {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "content-type": "application/json",
        "user-agent": "taiao-server-digest",
      },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    if (data.errors) throw new Error(JSON.stringify(data.errors));
    return data.data;
  };

  const repo = await gql(
    `query($owner:String!,$name:String!){ repository(owner:$owner,name:$name){
       id discussionCategories(first:25){ nodes{ id name } } } }`,
    { owner, name });
  const wanted = (env.DIGEST_CATEGORY || "Announcements").toLowerCase();
  const cats = repo.repository.discussionCategories.nodes;
  const cat = cats.find(c => c.name.toLowerCase() === wanted) || cats[0];
  if (!cat) throw new Error("no discussion categories");

  const created = await gql(
    `mutation($repo:ID!,$cat:ID!,$title:String!,$body:String!){
       createDiscussion(input:{repositoryId:$repo,categoryId:$cat,title:$title,body:$body}){
         discussion{ url } } }`,
    { repo: repo.repository.id, cat: cat.id, title, body });
  return created.createDiscussion.discussion.url;
}
