// Lightweight feedback logging. This currently just writes to the server
// console/logs (visible in your terminal locally, or in Vercel's function logs
// once deployed) so you have a real signal source without needing a database.
// If you want a proper dashboard later, swap the console.log calls for writes
// to a real datastore (e.g. Vercel Postgres, Supabase, or even a Google Sheet
// via its API).
export async function POST(request) {
  try {
    const { rating, question, answer } = await request.json();
    console.log("=== HAZEL FEEDBACK ===");
    console.log("Rating:", rating);
    console.log("Question:", question);
    console.log("Answer (truncated):", (answer || "").slice(0, 300));
    console.log("======================");
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false }, { status: 500 });
  }
}