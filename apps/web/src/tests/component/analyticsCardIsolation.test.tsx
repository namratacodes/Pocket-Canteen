import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AnalyticsCard } from '@/features/analytics/cards/AnalyticsCard';

const asQuery = <T,>(partial: Partial<UseQueryResult<T, Error>>) => partial as UseQueryResult<T, Error>;

describe('AnalyticsCard isolation', () => {
  it('a failing card shows its own retry while a healthy card still renders', () => {
    const refetch = vi.fn();
    render(
      <>
        <AnalyticsCard
          title="Tomorrow's prep sheet"
          errorTitle="Forecast unavailable. ML service offline"
          query={asQuery<string[]>({ isLoading: false, isError: true, error: new Error('503'), refetch })}
        >
          {() => <span>should not render</span>}
        </AnalyticsCard>
        <AnalyticsCard
          title="Peak hours"
          errorTitle="Peak hours unavailable"
          query={asQuery<string[]>({ isLoading: false, isError: false, data: ['1 PM'] })}
        >
          {(d) => <span>{d[0]} is the busiest hour</span>}
        </AnalyticsCard>
      </>
    );

    expect(screen.getByText(/forecast unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('should not render')).not.toBeInTheDocument();
    expect(screen.getByText('1 PM is the busiest hour')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when there is no data', () => {
    render(
      <AnalyticsCard
        title="Combos"
        errorTitle="x"
        query={asQuery<string[]>({ isLoading: false, isError: false, data: [] })}
        isEmpty={(d) => d.length === 0}
      >
        {() => <span>data</span>}
      </AnalyticsCard>
    );
    expect(screen.getByText(/no data yet/i)).toBeInTheDocument();
  });
});