import { Controller, Post, Get, Body, Param, Req } from "@nestjs/common";
import { Request } from "express";
import { DefectsService } from "./defects.service";
import { CreateDefectDto } from "./dto/create-defect.dto";
import { SendDefectMessageDto } from "./dto/send-defect-message.dto";

@Controller("defects")
export class DefectsController {
  constructor(private readonly defectsService: DefectsService) {}

  @Post()
  async create(@Body() createDto: CreateDefectDto, @Req() req: Request & { user?: Record<string, unknown> }) {
    if (!req.user || !req.user.id) {
      // Using a fallback for testing if req.user.id is missing
      const userId = (req.user?.sub as string) || "00000000-0000-0000-0000-000000000000";
      return this.defectsService.create(createDto, userId);
    }
    return this.defectsService.create(createDto, req.user.id as string);
  }

  @Get()
  async findAll() {
    return this.defectsService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.defectsService.findOne(id);
  }

  @Post(":id/messages")
  async addMessage(@Param("id") id: string, @Body() messageDto: SendDefectMessageDto) {
    return this.defectsService.addMessage(id, messageDto);
  }
}
