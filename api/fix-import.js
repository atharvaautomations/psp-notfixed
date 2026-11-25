const fs = require('fs');
const content = fs.readFileSync('src/notification/notification.controller.ts', 'utf8');
const newContent = content.replace(
  "import {\n  Body,\n  Controller,\n  Get,\n  Param,\n  ParseIntPipe,\n  Patch,\n  Post,\n  UseGuards,\n  Req,\n} from '@nestjs.common';",
  "import {\n  Body,\n  Controller,\n  Get,\n  Param,\n  ParseIntPipe,\n  Patch,\n  Post,\n  Query,\n  UseGuards,\n  Req,\n} from '@nestjs/common';"
);
fs.writeFileSync('src/notification/notification.controller.ts', newContent);
console.log('Done');