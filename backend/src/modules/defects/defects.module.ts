import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DefectEntity } from "./entities/defect.entity";
import { DefectMessageEntity } from "./entities/defect-message.entity";
import { DefectsService } from "./defects.service";
import { DefectsController } from "./defects.controller";

@Module({
  imports: [TypeOrmModule.forFeature([DefectEntity, DefectMessageEntity])],
  controllers: [DefectsController],
  providers: [DefectsService],
  exports: [DefectsService],
})
export class DefectsModule {}
