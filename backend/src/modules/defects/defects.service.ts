import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DefectEntity } from "./entities/defect.entity";
import { DefectMessageEntity, DefectMessageRole } from "./entities/defect-message.entity";
import { CreateDefectDto } from "./dto/create-defect.dto";
import { SendDefectMessageDto } from "./dto/send-defect-message.dto";

@Injectable()
export class DefectsService {
  constructor(
    @InjectRepository(DefectEntity)
    private readonly defectsRepo: Repository<DefectEntity>,
    @InjectRepository(DefectMessageEntity)
    private readonly messagesRepo: Repository<DefectMessageEntity>,
  ) {}

  async create(createDto: CreateDefectDto, userId: string): Promise<DefectEntity> {
    const defect = this.defectsRepo.create({
      documentId: createDto.documentId,
      reportedDefect: createDto.reportedDefect,
      purchaseDate: createDto.purchaseDate,
      currentMileage: createDto.currentMileage,
      createdBy: userId,
    });
    return this.defectsRepo.save(defect);
  }

  async findAll(): Promise<DefectEntity[]> {
    return this.defectsRepo.find();
  }

  async findOne(id: string): Promise<DefectEntity> {
    const defect = await this.defectsRepo.findOne({ where: { id } });
    if (!defect) {
      throw new NotFoundException(`Defect with id ${id} not found`);
    }
    return defect;
  }

  async addMessage(defectId: string, messageDto: SendDefectMessageDto): Promise<DefectMessageEntity> {
    const defect = await this.findOne(defectId);
    
    const userMessage = this.messagesRepo.create({
      defectId,
      role: DefectMessageRole.USER,
      content: messageDto.content,
    });
    await this.messagesRepo.save(userMessage);

    const history = await this.messagesRepo.find({
      where: { defectId },
      order: { createdAt: "ASC" },
    });

    const aiUrl = `${process.env.AI_SERVICE_URL}/defect/answer`;
    let httpResponse: Response | undefined;
    
    try {
      httpResponse = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: messageDto.content,
          documentId: defect.documentId,
          context: defect.contextJson || {},
          conversationHistory: history.map((item) => ({ role: item.role.toLowerCase(), content: item.content })),
        })
      });
    } catch (err: any) {
      console.error(err);
    }

    let aiResponse: any = {};
    if (httpResponse && httpResponse.ok) {
      try {
        aiResponse = JSON.parse(await httpResponse.text());
      } catch (e) {}
    }

    let assistantContent = "Could not reach the AI service.";
    if (aiResponse.answer) {
      assistantContent = aiResponse.answer;
    }

    const assistantMessage = this.messagesRepo.create({
      defectId,
      role: DefectMessageRole.ASSISTANT,
      content: assistantContent,
      confidenceScore: aiResponse.confidence || 0,
      evidenceJson: {
        evidence: aiResponse.evidence || [],
        responseType: aiResponse.responseType,
        decision: aiResponse.decision,
        coverageDecision: aiResponse.coverageDecision,
        explanation: aiResponse.explanation,
        matchedComponent: aiResponse.matchedComponent,
        candidates: aiResponse.candidates,
        coverages: aiResponse.coverages,
        turnCostUsd: aiResponse.turnCostUsd
      },
    });
    return this.messagesRepo.save(assistantMessage);
  }
}
