"use client";

interface ExpenseItem {
  name: string;
  amount: number;
  percentage: number;
}

interface ExpensesWidgetProps {
  expenses: ExpenseItem[];
  total: number;
}

function fmt(n: number) {
  return `RM ${n.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const BAR_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#A78BFA",
  "#C4B5FD",
  "#DDD6FE",
  "#E5E7EB",
  "#F3F4F6",
  "#F9FAFB",
];

export function ExpensesWidget({ expenses, total }: ExpensesWidgetProps) {
  const maxAmount = expenses.length > 0 ? Math.max(...expenses.map((e) => e.amount)) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2">
            Cost & Expenses
          </h3>
          <span className="text-3xl font-bold text-gray-900">{fmt(total)}</span>
          <p className="text-xs text-gray-400 mt-1">This month</p>
        </div>
      </div>

      {/* Expense Bars */}
      {expenses.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-400">No expenses this period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.slice(0, 6).map((expense, i) => {
            const barWidth = maxAmount > 0 ? (expense.amount / maxAmount) * 100 : 0;
            return (
              <div key={expense.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-600 truncate max-w-[60%]">
                    {expense.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {expense.percentage}%
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {fmt(expense.amount)}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
