export interface ExpenseLineItem {
  id: string;
  name: string;
  quantity: number;
  amount: number;
}

interface ExpenseDescriptionPayload {
  notes: string;
  lineItems: ExpenseLineItem[];
}

const DESCRIPTION_PREFIX = "__SPLITHIVE_EXPENSE__";

export const serializeExpenseDescription = (
  notes: string,
  lineItems: ExpenseLineItem[],
) => {
  return `${DESCRIPTION_PREFIX}${JSON.stringify({
    notes,
    lineItems,
  } satisfies ExpenseDescriptionPayload)}`;
};

export const parseExpenseDescription = (value: string | null | undefined) => {
  if (!value) {
    return {
      notes: "",
      lineItems: [] as ExpenseLineItem[],
      isStructured: false,
    };
  }

  if (!value.startsWith(DESCRIPTION_PREFIX)) {
    return {
      notes: value,
      lineItems: [] as ExpenseLineItem[],
      isStructured: false,
    };
  }

  try {
    const parsed = JSON.parse(value.slice(DESCRIPTION_PREFIX.length)) as Partial<ExpenseDescriptionPayload>;
    return {
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      lineItems: Array.isArray(parsed.lineItems)
        ? parsed.lineItems
            .map((item) => ({
              id: typeof item?.id === "string" ? item.id : crypto.randomUUID(),
              name: typeof item?.name === "string" ? item.name : "",
              quantity: typeof item?.quantity === "number" ? item.quantity : 1,
              amount: typeof item?.amount === "number" ? item.amount : 0,
            }))
            .filter((item) => item.name.trim().length > 0)
        : [],
      isStructured: true,
    };
  } catch {
    return {
      notes: value,
      lineItems: [] as ExpenseLineItem[],
      isStructured: false,
    };
  }
};
