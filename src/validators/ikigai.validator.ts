import { z } from 'zod';

export const submitIkigaiResponsesSchema = z.object({
  body: z.object({
    questionnaireId: z.string().uuid('Invalid questionnaire ID format'),
    responses: z
      .array(
        z.object({
          questionId: z.string().uuid('Invalid question ID format'),
          response: z.string().min(1, 'Response cannot be empty'),
        }),
      )
      .min(1, 'At least one question response must be provided'),
  }),
});

export const updateIkigaiResponsesSchema = z.object({
  body: z.object({
    questionnaireId: z.string().uuid('Invalid questionnaire ID format'),
    responses: z
      .array(
        z.object({
          questionId: z.string().uuid('Invalid question ID format'),
          response: z.string().min(1, 'Response cannot be empty'),
        }),
      )
      .min(1, 'At least one question response must be provided'),
  }),
});
