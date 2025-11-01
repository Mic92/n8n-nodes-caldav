# n8n-nodes-caldav

This is an n8n community node for CalDAV integration. It lets you use CalDAV servers (Nextcloud, iCloud, Radicale, etc.) in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Features

- ✅ **Calendar Operations**: List all calendars from your CalDAV server
- ✅ **Event Operations**: Create, read, update, delete calendar events
- ✅ **Todo Operations**: Full CRUD support for CalDAV todos/tasks
- ✅ **Trigger Node**: Poll for new or updated events
- ✅ **Server Support**: Works with Nextcloud, iCloud, Radicale, and any CalDAV-compliant server
- ✅ **Recurring Events**: Support for RRULE (recurrence rules)
- ✅ **Attendees**: Manage event attendees via email
- ✅ **Conflict Detection**: ETag support prevents lost updates

## Installation

### Community Nodes (Recommended)

For user installations in n8n, install via the [Community Nodes](https://docs.n8n.io/integrations/community-nodes/installation/) interface:

1. Go to **Settings** > **Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-caldav` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

After installing the node, you can use it like any other node in n8n.

### Manual Installation (Development)

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

## Configuration

### Credentials

This node uses Basic Authentication. You'll need:

- **Server URL**: Your CalDAV server URL
  - Nextcloud: `https://your-nextcloud.com/remote.php/dav`
  - iCloud: `https://caldav.icloud.com`
  - Radicale: `https://your-radicale.com`
- **Username**: Your CalDAV username
- **Password**: Your CalDAV password (or app-specific password for iCloud)

### Server-Specific Notes

#### Nextcloud
- URL format: `https://your-domain.com/remote.php/dav`
- Use your regular Nextcloud username and password
- Or create an app-specific password in Settings > Security

#### iCloud
- URL: `https://caldav.icloud.com`
- Username: Your Apple ID email
- Password: Generate an app-specific password at appleid.apple.com

#### Radicale
- URL: Your Radicale server URL
- Use your configured Radicale credentials

## Operations

### Calendar Resource

- **Get All**: List all available calendars

### Event Resource

- **Create**: Create a new event
- **Get**: Get a single event by URL
- **Get All**: Get all events from a calendar (with optional time range filtering)
- **Update**: Update an existing event (requires ETag)
- **Delete**: Delete an event

### Todo Resource

- **Create**: Create a new todo/task
- **Get**: Get a single todo by URL
- **Get All**: Get all todos from a calendar
- **Update**: Update an existing todo (requires ETag)
- **Delete**: Delete a todo

### Trigger

- **Event Created**: Trigger when new events are created
- **Event Updated**: Trigger when events are modified
- **Event Started**: Trigger when events start

## Usage Examples

### Example 1: Create Event from Form Submission

```
Webhook (Form submission)
  ↓
CalDAV: Create Event
  - Summary: {{$json.title}}
  - Start: {{$json.start_time}}
  - End: {{$json.end_time}}
  - Attendees: {{$json.email}}
  ↓
Send Email (Confirmation)
```

### Example 2: Daily Event Digest

```
Schedule Trigger (Daily 6 AM)
  ↓
CalDAV: Get All Events
  - Time Range Start: {{$now}}
  - Time Range End: {{$now.plus(1, 'day')}}
  ↓
Email: Send daily schedule
```

### Example 3: Event Reminders

```
CalDAV Trigger: Event Started
  ↓
Send SMS Reminder
```

### Example 4: Sync Events to Database

```
CalDAV Trigger: Event Created
  ↓
Postgres: Insert event into database
```

## Recurring Events

Recurring events are supported via RRULE format:

```
FREQ=DAILY;COUNT=10              # Daily for 10 occurrences
FREQ=WEEKLY;BYDAY=MO,WE,FR       # Every Monday, Wednesday, Friday
FREQ=MONTHLY;BYMONTHDAY=15       # 15th of every month
FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1  # Every January 1st
```

## Development

```bash
# Install dependencies
npm install

# Watch mode (auto-compile on changes)
npm run dev

# Build
npm run build

# Format code
npm run format

# Lint
npm run lint

# Fix lint issues
npm run lintfix
```

## Compatibility

- n8n version: 1.0.0+
- Node.js: 18.x or higher

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [CalDAV RFC 4791](https://tools.ietf.org/html/rfc4791)
- [iCalendar RFC 5545](https://tools.ietf.org/html/rfc5545)

## License

[MIT](LICENSE.md)

## Credits

Built with:
- [tsdav](https://github.com/natelindev/tsdav) - TypeScript CalDAV client
- [ical.js](https://github.com/kewisch/ical.js) - iCalendar parser

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/Mic92/n8n-nodes-caldav/issues).
