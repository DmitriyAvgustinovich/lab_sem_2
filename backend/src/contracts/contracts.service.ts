// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { PrismaService } from 'src/utils/prisma.service';
import { GeneratePdfService } from 'src/utils/generate-pdf.service';

@Injectable()
export class ContractsService {
  constructor(
    private db: PrismaService,
    private genPDF: GeneratePdfService,
  ) {}

  async findAllMin(payoutAmount: number) {
    const contracts = await this.db.queryRaw(`
      SELECT * FROM contracts
      WHERE payout_to_client <= ${payoutAmount};
    `);
    return contracts;
  }

  async findAllMax(payoutAmount: number) {
    const contracts = await this.db.queryRaw(`
      SELECT * FROM contracts
      WHERE payout_to_client >= ${payoutAmount};
    `);
    return contracts;
  }

  async findАll(startDate: Date, endDate: Date) {
    const contracts = await this.db.$queryRaw`
      SELECT * FROM contracts
      WHERE creation_date >= ${startDate} AND creation_date <= ${endDate}
    `;

    return contracts;
  }

  async create(body: CreateContractDto) {
    const contract = await this.db.$queryRaw`
      INSERT INTO contracts (contract_type, payment_date, termination_date, payout_to_client, client_code, pledge_code, employee_code)
      VALUES (${body.contract_type}, ${body.payment_date}, ${body.termination_date}, ${body.payout_to_client}, ${body.client_code}, ${body.pledge_code}, ${body.employee_code})
      RETURNING *;
    `;

    await this.genPDF.generatePDF(contract);
    return contract;
  }

  async findAll(startDate: Date, endDate: Date) {
    console.log(startDate, endDate);
    const contracts = await this.db.$queryRaw`
      SELECT * FROM contracts
      WHERE creation_date >= ${startDate} AND creation_date <= ${endDate}
    `;
    return contracts;
  }

  async findOne(id: number) {
    const contract = await this.db.$queryRaw`
      SELECT * FROM contracts
      WHERE contract_code = ${id};
    `;

    return contract;
  }

  async update(id: number, body: UpdateContractDto) {
    await this.db.$queryRaw`
      UPDATE contracts
      SET contract_type = ${body.contract_type},
          payment_date = ${body.payment_date},
          termination_date = ${body.termination_date},
          payout_to_client = ${body.payout_to_client},
          client_code = ${body.client_code},
          pledge_code = ${body.pledge_code},
          employee_code = ${body.employee_code}
      WHERE contract_code = ${id}
      RETURNING *;
    `;
  }

  async remove(id: number) {
    await this.db.$queryRaw`
      DELETE FROM contracts
      WHERE contract_code = ${id}
      RETURNING *;
    `;
  }

  async checkIfExists(model: string, field, value, errorMessage) {
    const result = await this.db.$queryRaw`
      SELECT * FROM ${model}
      WHERE ${field} = ${value};
    `;

    if (!result) {
      throw new NotFoundException(errorMessage);
    }
  }
}
