import prisma from '../config/prisma';
import { IkigaiDimension } from '@prisma/client';

export class IkigaiRepository {
  /**
   * Finds the currently active Ikigai questionnaire with its active ordered questions.
   */
  async findActiveQuestionnaire() {
    return prisma.ikigaiQuestionnaire.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Finds a questionnaire by ID.
   */
  async findQuestionnaireById(id: string) {
    return prisma.ikigaiQuestionnaire.findUnique({
      where: { id },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Finds all responses submitted by an employee.
   */
  async findResponsesByEmployee(employeeId: string) {
    return prisma.ikigaiResponse.findMany({
      where: { employeeId },
      include: {
        question: true,
      },
      orderBy: { question: { displayOrder: 'asc' } },
    });
  }

  /**
   * Saves or updates employee responses in a transaction.
   */
  async saveResponses(
    employeeId: string,
    organizationId: string,
    questionnaireId: string,
    responses: Array<{ questionId: string; dimension: IkigaiDimension; response: string }>,
  ) {
    return prisma.$transaction(async (tx) => {
      const saved: any[] = [];
      for (const item of responses) {
        const record = await tx.ikigaiResponse.upsert({
          where: {
            employeeId_questionId: {
              employeeId,
              questionId: item.questionId,
            },
          },
          update: {
            response: item.response,
            dimension: item.dimension,
            questionnaireId,
            updatedAt: new Date(),
          },
          create: {
            employeeId,
            organizationId,
            questionnaireId,
            questionId: item.questionId,
            dimension: item.dimension,
            response: item.response,
          },
        });
        saved.push(record);
      }
      return saved;
    });
  }

  /**
   * Counts responses for a specific employee and questionnaire.
   */
  async countEmployeeResponses(employeeId: string, questionnaireId: string): Promise<number> {
    return prisma.ikigaiResponse.count({
      where: {
        employeeId,
        questionnaireId,
      },
    });
  }
}

export const ikigaiRepository = new IkigaiRepository();
export default ikigaiRepository;
