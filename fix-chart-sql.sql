-- FIXED CHART DATA FUNCTION
-- Execute this SQL in Supabase to fix chart trend lines
-- ============================================================================

CREATE OR REPLACE FUNCTION get_chart_data(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  group_by_period TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  date_format TEXT;
BEGIN
  -- Set date grouping format based on period
  CASE group_by_period
    WHEN 'week' THEN date_format := 'YYYY-IW';
    WHEN 'month' THEN date_format := 'YYYY-MM';
    ELSE date_format := 'YYYY-MM-DD';
  END CASE;

  -- Build the complete result with proper date handling
  WITH daily_data AS (
    SELECT 
      TO_CHAR("Inv Date", date_format) as grouped_date,
      SUM("SaleWithVAT") as daily_revenue,
      SUM("Profit") as daily_profit
    FROM profit_analysis_view_current
    WHERE (start_date IS NULL OR "Inv Date" >= start_date)
      AND (end_date IS NULL OR "Inv Date" <= end_date)
      AND "Inv Date" IS NOT NULL
    GROUP BY TO_CHAR("Inv Date", date_format)
    ORDER BY grouped_date
  ),
  date_range_info AS (
    SELECT 
      MIN("Inv Date") as actual_from,
      MAX("Inv Date") as actual_to
    FROM profit_analysis_view_current
    WHERE (start_date IS NULL OR "Inv Date" >= start_date)
      AND (end_date IS NULL OR "Inv Date" <= end_date)
      AND "Inv Date" IS NOT NULL
  )
  SELECT json_build_object(
    'revenueChart', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'date', grouped_date,
          'value', daily_revenue,
          'label', 'Revenue'
        ) ORDER BY grouped_date
      ) FROM daily_data), 
      '[]'::json
    ),
    'profitChart', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'date', grouped_date,
          'value', daily_profit,
          'label', 'Profit'
        ) ORDER BY grouped_date
      ) FROM daily_data),
      '[]'::json
    ),
    'marginChart', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'date', grouped_date,
          'value', CASE 
            WHEN daily_revenue > 0 
            THEN (daily_profit / daily_revenue) * 100 
            ELSE 0 
          END,
          'label', 'Margin %'
        ) ORDER BY grouped_date
      ) FROM daily_data),
      '[]'::json
    ),
    'dateRange', json_build_object(
      'from', start_date,
      'to', end_date,
      'actualFrom', (SELECT actual_from FROM date_range_info),
      'actualTo', (SELECT actual_to FROM date_range_info)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT get_chart_data();