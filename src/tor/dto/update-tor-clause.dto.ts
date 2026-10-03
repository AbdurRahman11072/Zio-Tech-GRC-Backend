import { PartialType } from '@nestjs/mapped-types';
import { CreateTorClauseDto } from './create-tor-clause.dto.js';

export class UpdateTorClauseDto extends PartialType(CreateTorClauseDto) {}
