import prisma from '../config/prisma';
import { ikigaiRepository } from '../repositories/ikigai.repository';
import { userRepository } from '../repositories/user.repository';
import { employeeRepository } from '../repositories/employee.repository';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/errorHandler';
import { OnboardingStatus, IkigaiDimension } from '@prisma/client';

export class IkigaiService {
  /**
   * Retrieves the active questionnaire along with all active, ordered questions.
   */
  async getCurrentQuestionnaire() {
    const questionnaire = await ikigaiRepository.findActiveQuestionnaire();
    if (!questionnaire) {
      throw new AppError('No active Ikigai questionnaire is currently configured', 404);
    }

    // Group questions by Ikigai dimension for convenient client rendering
    const questionsByDimension: Record<IkigaiDimension, typeof questionnaire.questions> = {
      [IkigaiDimension.LOVE]: [],
      [IkigaiDimension.GOOD_AT]: [],
      [IkigaiDimension.WORLD_NEEDS]: [],
      [IkigaiDimension.PAID_FOR]: [],
    };

    for (const q of questionnaire.questions) {
      if (questionsByDimension[q.dimension]) {
        questionsByDimension[q.dimension].push(q);
      }
    }

    return {
      id: questionnaire.id,
      version: questionnaire.version,
      title: questionnaire.title,
      description: questionnaire.description,
      questions: questionnaire.questions,
      dimensions: questionsByDimension,
    };
  }

  /**
   * Retrieves the authenticated employee's personal Ikigai responses.
   */
  async getEmployeeResponses(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || !user.employee) {
      throw new AppError('Employee record not found', 404);
    }

    const responses = await ikigaiRepository.findResponsesByEmployee(user.employee.id);

    // Group responses by dimension
    const byDimension: Record<string, typeof responses> = {
      [IkigaiDimension.LOVE]: [],
      [IkigaiDimension.GOOD_AT]: [],
      [IkigaiDimension.WORLD_NEEDS]: [],
      [IkigaiDimension.PAID_FOR]: [],
    };

    for (const r of responses) {
      if (byDimension[r.dimension]) {
        byDimension[r.dimension].push(r);
      }
    }

    return {
      employeeId: user.employee.id,
      onboardingStatus: user.employee.onboardingStatus,
      onboardingCompletedAt: user.employee.onboardingCompletedAt,
      responses,
      byDimension,
      totalAnswered: responses.length,
    };
  }

  /**
   * Submits employee's Ikigai questionnaire responses during or after onboarding.
   * Validates required questions, saves responses, and transitions status to COMPLETED.
   */
  async submitResponses(
    userId: string,
    data: {
      questionnaireId: string;
      responses: Array<{ questionId: string; response: string }>;
    },
  ) {
    const user = await userRepository.findById(userId);
    if (!user || !user.employee) {
      throw new AppError('Employee record not found', 404);
    }

    const employee = user.employee;
    const questionnaire = await ikigaiRepository.findQuestionnaireById(data.questionnaireId);

    if (!questionnaire || !questionnaire.isActive) {
      throw new AppError('The specified questionnaire is not active or does not exist', 400);
    }

    // Map questionnaire questions for validation
    const questionMap = new Map(questionnaire.questions.map((q) => [q.id, q]));
    const responseMap = new Map(
      data.responses.map((r) => [r.questionId, (r.response || '').trim()]),
    );

    // 1. Validate that all submitted question IDs exist in this questionnaire
    for (const r of data.responses) {
      if (!questionMap.has(r.questionId)) {
        throw new AppError(`Invalid question ID '${r.questionId}' for questionnaire v${questionnaire.version}`, 400);
      }
    }

    // 2. Validate that all required questions have non-empty responses
    for (const q of questionnaire.questions) {
      if (q.isRequired) {
        const answer = responseMap.get(q.id);
        if (!answer || answer.length === 0) {
          throw new AppError(`Question '${q.questionText}' is required. Please provide a response.`, 400);
        }
      }
    }

    // 3. Prepare structured response items
    const formattedResponses = data.responses
      .filter((r) => (r.response || '').trim().length > 0)
      .map((r) => {
        const question = questionMap.get(r.questionId)!;
        return {
          questionId: r.questionId,
          dimension: question.dimension,
          response: r.response.trim(),
        };
      });

    return prisma.$transaction(async (tx) => {
      // Save responses
      for (const item of formattedResponses) {
        await tx.ikigaiResponse.upsert({
          where: {
            employeeId_questionId: {
              employeeId: employee.id,
              questionId: item.questionId,
            },
          },
          update: {
            response: item.response,
            dimension: item.dimension,
            questionnaireId: questionnaire.id,
            updatedAt: new Date(),
          },
          create: {
            employeeId: employee.id,
            organizationId: employee.organizationId,
            questionnaireId: questionnaire.id,
            questionId: item.questionId,
            dimension: item.dimension,
            response: item.response,
          },
        });
      }

      // Transition employee to COMPLETED if not already completed
      const updatedEmployee = await tx.employee.update({
        where: { id: employee.id },
        data: {
          onboardingStatus: OnboardingStatus.COMPLETED,
          onboardingCompletedAt: employee.onboardingCompletedAt || new Date(),
        },
      });

      // Audit log: records completion event WITHOUT storing reflective answers in audit logs
      await auditRepository.log(
        {
          action: 'IKIGAI_COMPLETED',
          organizationId: employee.organizationId,
          userId,
          details: {
            employeeId: employee.id,
            questionnaireId: questionnaire.id,
            questionnaireVersion: questionnaire.version,
            answeredQuestionsCount: formattedResponses.length,
          },
        },
        tx,
      );

      return {
        onboardingStatus: updatedEmployee.onboardingStatus,
        onboardingCompletedAt: updatedEmployee.onboardingCompletedAt,
        answeredCount: formattedResponses.length,
      };
    });
  }

  /**
   * Updates existing Ikigai responses for an employee who has already completed onboarding.
   */
  async updateResponses(
    userId: string,
    data: {
      questionnaireId: string;
      responses: Array<{ questionId: string; response: string }>;
    },
  ) {
    const user = await userRepository.findById(userId);
    if (!user || !user.employee) {
      throw new AppError('Employee record not found', 404);
    }

    const employee = user.employee;
    const questionnaire = await ikigaiRepository.findQuestionnaireById(data.questionnaireId);

    if (!questionnaire) {
      throw new AppError('Questionnaire not found', 404);
    }

    const questionMap = new Map(questionnaire.questions.map((q) => [q.id, q]));

    for (const r of data.responses) {
      if (!questionMap.has(r.questionId)) {
        throw new AppError(`Invalid question ID '${r.questionId}'`, 400);
      }
    }

    const formatted = data.responses
      .filter((r) => (r.response || '').trim().length > 0)
      .map((r) => {
        const question = questionMap.get(r.questionId)!;
        return {
          questionId: r.questionId,
          dimension: question.dimension,
          response: r.response.trim(),
        };
      });

    return prisma.$transaction(async (tx) => {
      for (const item of formatted) {
        await tx.ikigaiResponse.upsert({
          where: {
            employeeId_questionId: {
              employeeId: employee.id,
              questionId: item.questionId,
            },
          },
          update: {
            response: item.response,
            dimension: item.dimension,
            questionnaireId: questionnaire.id,
            updatedAt: new Date(),
          },
          create: {
            employeeId: employee.id,
            organizationId: employee.organizationId,
            questionnaireId: questionnaire.id,
            questionId: item.questionId,
            dimension: item.dimension,
            response: item.response,
          },
        });
      }

      await auditRepository.log(
        {
          action: 'IKIGAI_UPDATED',
          organizationId: employee.organizationId,
          userId,
          details: {
            employeeId: employee.id,
            updatedCount: formatted.length,
          },
        },
        tx,
      );

      return {
        updatedCount: formatted.length,
      };
    });
  }

  /**
   * Retrieves overall onboarding and Ikigai status for the current user.
   */
  async getStatus(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user || !user.employee) {
      throw new AppError('Employee record not found', 404);
    }

    const totalAnswered = await ikigaiRepository.countEmployeeResponses(
      user.employee.id,
      (await ikigaiRepository.findActiveQuestionnaire())?.id || '',
    );

    return {
      employeeId: user.employee.id,
      onboardingStatus: user.employee.onboardingStatus,
      onboardingCompletedAt: user.employee.onboardingCompletedAt,
      isCompleted: user.employee.onboardingStatus === OnboardingStatus.COMPLETED,
      totalAnswered,
    };
  }
}

export const ikigaiService = new IkigaiService();
export default ikigaiService;
