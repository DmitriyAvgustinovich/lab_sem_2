// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/utils/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsWithPayoutBetweenDto } from './dto/clientsWithPayoutBetween.dto';

@Injectable()
export class ClientsService {
  constructor(private db: PrismaService) {}
  async create(body: CreateClientDto) {
    await this.db
      .$queryRaw`SELECT * FROM clients WHERE passport_data = ${body.passport_data} LIMIT 1`;

    const phoneNumber = body.phone_number === '' ? null : body.phone_number;
    const address = body.address === '' ? null : body.address;

    const client = await this.db.$queryRaw`
        INSERT INTO clients (full_name, passport_data, phone_number, address)
        VALUES (${body.full_name}, ${body.passport_data}, ${phoneNumber}, ${address})
        RETURNING *`;

    return client;
  }

  async findAll() {
    const clientsWithTotalPayouts = await this.db.$queryRaw`
        SELECT c.*, COALESCE(SUM(co.payout_to_client), 0) AS total_payout
        FROM clients c
        LEFT JOIN contracts co ON c.client_code = co.client_code
        GROUP BY c.client_code`;

    return clientsWithTotalPayouts;
  }

  async findOne(id: number) {
    const clientWithSum = await this.db.$queryRaw`
        SELECT c.*, COALESCE(SUM(co.payout_to_client), 0) AS total_payout
        FROM clients c
        LEFT JOIN contracts co ON c.client_code = co.client_code
        WHERE c.client_code = ${id}
        GROUP BY c.client_code
        LIMIT 1`;

    return clientWithSum;
  }

  async update(id: number, body: UpdateClientDto) {
    const updatedUser = await this.db.$queryRaw`
        UPDATE clients
        SET phone_number = ${body.phone_number}, 
        address = ${body.address}, 
        passport_data = ${body.passport_data}, 
        full_name = ${body.full_name}
        WHERE client_code = ${id}
        RETURNING *`;

    return updatedUser;
  }

  async remove(id: number) {
    const contracts = await this.db
      .$queryRaw`SELECT * FROM contracts WHERE client_code = ${id}`;

    if (contracts) {
      await this.db
        .$queryRaw`DELETE FROM clients WHERE client_code = ${id} RETURNING *`;
    }

    throw new NotFoundException(`Клиент ${id} не найден.`);
  }

  async findUniqueClientAddress() {
    return await this.db.$queryRaw`SELECT DISTINCT address FROM clients`;
  }

  async findFirst10Clients() {
    return await this.db
      .$queryRaw`SELECT * FROM clients ORDER BY client_code ASC LIMIT 10`;
  }

  async findLast15Clients() {
    return await this.db
      .$queryRaw`SELECT * FROM clients ORDER BY client_code DESC LIMIT 15`;
  }

  async averagePayout() {
    return await this.db.$queryRaw`SELECT AVG(payout_to_client) FROM contracts`;
  }

  async maxPayout() {
    return await this.db.$queryRaw`SELECT MAX(payout_to_client) FROM contracts`;
  }

  async minPayout() {
    return await this.db.$queryRaw`SELECT MIN(payout_to_client) FROM contracts`;
  }

  async findClientById() {
    return await this.db.$queryRaw`
    SELECT c.*, COALESCE(SUM(co.payout_to_client), 0) AS total_payout
    FROM clients c
    LEFT JOIN contracts co ON c.client_code = co.client_code
    WHERE c.client_code = ${id}
    GROUP BY c.client_code
    LIMIT 1`;
  }

  async findClientsByNamePattern(pattern: string) {
    return await this.db.$queryRaw`
    SELECT * FROM clients
    WHERE full_name LIKE ${'%' + pattern + '%'}
       OR address LIKE ${'%' + pattern + '%'}
       OR phone_number LIKE ${'%' + pattern + '%'}
    `;
  }
  async findClientsWithAddressAndNoPhoneNumber() {
    return await this.db.$queryRaw`
    SELECT * FROM clients
    WHERE (address IS NOT NULL AND phone_number IS NULL)
       OR (address IS NULL AND phone_number IS NOT NULL)
    `;
  }

  async findClientsWithPhoneNumber() {
    return await this.db
      .$queryRaw`SELECT * FROM clients WHERE phone_number IS NOT NULL`;
  }

  async clientsWithPayoutBetween(body: ClientsWithPayoutBetweenDto) {
    return this.db.$queryRaw`
      SELECT c.*, SUM(co.payout_to_client) as total_payout
      FROM clients c
      JOIN contracts co ON c.client_code = co.client_code
      GROUP BY c.client_code
      HAVING SUM(co.payout_to_client) BETWEEN ${body.min} AND ${body.max}`;
  }

  async clientsSortedByNameAndPhoneNumber(
    sortByName: string,
    sortByNumber: string,
  ) {
    return this.db.$queryRaw`
      SELECT full_name, full_number
      FROM clients
      ORDER BY 
        ${sortByName === 'ASC' ? 'full_name ASC' : 'full_name DESC'},
        ${sortByNumber === 'ASC' ? 'full_number ASC' : 'full_number DESC'};
    `;
  }

  async findClientsSorted() {
    return this.db
      .$queryRaw`SELECT * FROM clients ORDER BY full_name ASC, client_code DESC`;
  }
  async countContractsPerClient() {
    return this.db.$queryRaw`
    SELECT 
    c.client_code, 
    c.full_name, 
    c.address, 
    c.phone_number, 
    c.passport_data, 
    COUNT(co.client_code) AS contracts_count
    FROM clients c
    LEFT JOIN contracts co ON c.client_code = co.client_code
    GROUP BY c.client_code
    ORDER BY contracts_count DESC
  `;
  }

  async findClientsWithNamesStartingAOrB() {
    return this.db.$queryRaw`
        (SELECT * FROM clients WHERE full_name LIKE 'А%')
        EXCEPT
        (SELECT * FROM clients WHERE full_name LIKE 'Б%')
        ORDER BY full_name ASC`;
  }
}
