# UpStatus

Simple uptime monitoring CLI.

## Install

```bash
npm install -g upstatus
```

## Usage

```bash
# Monitor URLs
upstatus https://api.example.com https://site.com

# Custom interval (default 30s)
upstatus https://api.example.com -i 60

# Demo mode
npx upstatus
```

## Features

- Pretty logs (powered by logfx)
- Response time tracking
- Uptime percentage
- Status detection (up/down/degraded)

## License

MIT
