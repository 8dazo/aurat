import { wrapTool, reportOutput } from 'aurat/testing';
const createTicket = wrapTool('create_ticket', async () => {
  throw new Error('Real ticket integration must never run during replay');
});
const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'demo-model', messages: [{ role: 'user', content: 'Create a ticket for a broken login' }] }),
});
if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
const completion = await response.json();
const args = JSON.parse(completion.choices[0].message.tool_calls[0].function.arguments);
if (process.argv.includes('--wrong-args')) args.priority = 'urgent';
const ticket = await createTicket(args);
if (process.argv.includes('--duplicate')) await createTicket(args);
reportOutput({ ticketId: ticket.id, status: process.argv.includes('--bad-output') ? 'deleted' : 'created' });
