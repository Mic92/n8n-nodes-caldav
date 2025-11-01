# n8n-nodes-caldav

> 🔌 Connect your calendars to n8n! Automate Nextcloud, iCloud, Google Calendar, and any CalDAV-compatible calendar.

[n8n](https://n8n.io/) is a workflow automation platform.

## Quick Start

1. Install the node (see [Installation](#installation) below)
2. Add your calendar credentials (see [Setup Guide](#setup-guide))
3. Start automating! ✨

## What You Can Do

### 📅 Manage Your Calendar

- List all your calendars
- Create, view, update, and delete events
- Create and manage todos/tasks
- Add attendees to events
- Set up recurring events (daily meetings, weekly reminders, etc.)

### 🔔 Automate with Triggers

- Get notified when someone creates a new event
- React when events are updated or rescheduled
- Trigger workflows when events start (great for reminders!)
- Works perfectly with recurring events - each occurrence triggers separately

### 🔗 Works With Your Favorite Calendar Apps

- ✅ Nextcloud Calendar
- ✅ iCloud Calendar
- ✅ Google Calendar (via CalDAV)
- ✅ Radicale
- ✅ Any CalDAV-compatible calendar server

## Installation

This node is currently in development and not yet published to npm.

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/Mic92/n8n-nodes-caldav.git
cd n8n-nodes-caldav

# Install dependencies
npm install

# Build the node
npm run build

# Link to your n8n installation
npm link
cd ~/.n8n/custom
npm link n8n-nodes-caldav
```

After linking, restart n8n and the CalDAV nodes will be available in your node palette.

## Setup Guide

After installing the node, you'll need to connect it to your calendar:

### Nextcloud Calendar

1. **Server URL**: `https://your-nextcloud.com/remote.php/dav`
   - Replace `your-nextcloud.com` with your actual Nextcloud server address
2. **Username**: Your Nextcloud username
3. **Password**: Your Nextcloud password
   - **Tip**: For better security, create an app-specific password in Nextcloud Settings → Security

### iCloud Calendar

1. **Server URL**: `https://caldav.icloud.com`
2. **Username**: Your Apple ID email address
3. **Password**: You'll need an app-specific password
   - Go to [appleid.apple.com](https://appleid.apple.com)
   - Navigate to "Sign-In and Security" → "App-Specific Passwords"
   - Generate a new password for n8n

### Google Calendar

1. **Server URL**: `https://apidata.googleusercontent.com/caldav/v2/`
2. **Username**: Your full Gmail address
3. **Password**: Create an app password in your Google account settings
   - Note: You'll need to enable 2-factor authentication first

### Other CalDAV Servers (Radicale, Baikal, etc.)

1. **Server URL**: Your server's CalDAV URL (ask your admin if unsure)
2. **Username**: Your account username
3. **Password**: Your account password

## How to Use

### Working with Calendars

- **List Calendars**: See all your available calendars

### Working with Events

- **Create Event**: Add a new event to your calendar
  - Set title, start/end times, location, description
  - Add attendees by email
  - Create recurring events (daily, weekly, monthly, etc.)
- **Get Event**: Retrieve a specific event
- **Get All Events**: Fetch all events from a calendar
  - Optional: Filter by date range to get only upcoming events
- **Update Event**: Modify an existing event
- **Delete Event**: Remove an event from your calendar

### Working with Todos

- **Create Todo**: Add a new task to your calendar
- **Get Todo**: Retrieve a specific todo
- **Get All Todos**: Fetch all tasks from a calendar
- **Update Todo**: Modify an existing todo (change status, priority, etc.)
- **Delete Todo**: Remove a todo from your calendar

### Triggers (Start Workflows Automatically)

The CalDAV Trigger node watches your calendar and starts workflows when things happen:

- **Event Created**: Triggers when someone creates a new event
  - Great for: Sending welcome emails to meeting attendees, logging new bookings

- **Event Updated**: Triggers when someone changes an event
  - Great for: Notifying attendees of schedule changes, updating external systems

- **Event Started**: Triggers when an event begins
  - Great for: Sending meeting reminders, starting Zoom calls, posting to Slack
  - **Bonus**: For recurring events (like "Daily Standup"), this triggers for each occurrence

## Real-World Examples

### 💼 Automatic Meeting Room Booking

When someone books a meeting through your website:

```
Webhook (booking form)
  ↓
CalDAV: Create Event
  ↓
Send confirmation email
```

### 📧 Daily Schedule Email

Get your day's schedule every morning:

```
Schedule Trigger (Every day at 6 AM)
  ↓
CalDAV: Get All Events (today only)
  ↓
Send email with your schedule
```

### 🔔 Smart Meeting Reminders

Get reminded when any meeting starts (works great with recurring meetings!):

```
CalDAV Trigger: Event Started
  ↓
Send SMS/Slack message
```

**Special feature**: If you have a "Daily Standup" recurring event, you'll get a reminder every single day automatically!

### 📊 Calendar Analytics

Track all your meetings in a database:

```
CalDAV Trigger: Event Created
  ↓
Save to database (Postgres/MySQL/etc.)
  ↓
Build reports on meeting trends
```

### 🎯 Task Management Integration

Sync your calendar todos with your project management tool:

```
CalDAV Trigger: Event Created (on "Tasks" calendar)
  ↓
Create card in Trello/Asana/Jira
```

## Recurring Events

You can create events that repeat automatically! Here are some examples:

### Common Recurring Event Patterns

When creating an event, use the "Recurrence Rule" field:

- **Daily standup for 10 days**: `FREQ=DAILY;COUNT=10`
- **Weekly team meeting (every Monday)**: `FREQ=WEEKLY;BYDAY=MO`
- **Bi-weekly sprint planning**: `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO`
- **Monthly review (every 15th)**: `FREQ=MONTHLY;BYMONTHDAY=15`
- **Annual company party**: `FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25`
- **Gym every Mon/Wed/Fri**: `FREQ=WEEKLY;BYDAY=MO,WE,FR`

### How Triggers Handle Recurring Events

- **Event Created/Updated triggers**: Get notified once when you create or modify the series
  - Example: When you create "Weekly Team Meeting", you get 1 trigger

- **Event Started trigger**: Get notified for each occurrence
  - Example: "Weekly Team Meeting" triggers every Monday
  - Perfect for sending reminders or starting Zoom calls automatically!

## Troubleshooting

### "Calendar not found" error

Make sure you're using the correct server URL for your calendar provider (see Setup Guide above).

### Authentication failed

- **iCloud users**: You must use an app-specific password, not your regular password
- **Google Calendar users**: Enable 2-factor authentication and create an app password
- **Nextcloud users**: Check that your username and password are correct

### Events not showing up

- Try using "Get All Events" without filters first to see if events are being retrieved
- Check that you're looking at the correct calendar
- For time-range filters, make sure your dates are in the correct format

### Trigger not firing

- Triggers poll your calendar periodically (check your n8n polling interval settings)
- Make sure the calendar URL in your trigger matches exactly
- For "Event Started" triggers, the event must start within the polling interval

## Version Requirements

- **n8n**: 1.0.0 or higher
- **Node.js**: 18.x or higher

## For Developers

Want to contribute or modify this node?

```bash
# Install dependencies
npm install

# Build the node
npm run build

# Run tests
npm test

# Auto-compile on changes
npm run dev
```

See our [contribution guidelines](CONTRIBUTING.md) for more details.

## License

[MIT](LICENSE.md) - Free to use and modify!

## Credits

This node is built with:

- [tsdav](https://github.com/natelindev/tsdav) - CalDAV client library
- [ical.js](https://github.com/kewisch/ical.js) - Calendar event parser

Thanks to all [contributors](https://github.com/Mic92/n8n-nodes-caldav/graphs/contributors)!
