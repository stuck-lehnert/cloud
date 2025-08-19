import z from 'zod';
import { resourceRouter } from '../trpc';
import { myInputId, myOutputId, myString } from '../schemas';

const moreUnits = z.record(z.string(), z.number().nonnegative());

const productSchema = z.object({
  id: myOutputId,

  name: z.string(),
  description: z.string().nullable(),

  base_unit: z.string(),
  more_units: moreUnits,
}).strip();

const productUnique = z.object({ id: myInputId }).strict();

const productCreate = z.object({
  name: myString,
  description: myString.nullish(),
  base_unit: myString,
  more_units: moreUnits.default({}),
}).strict();

const productUpdate = productCreate.partial();

export const productsRouter = resourceRouter({
  
});
