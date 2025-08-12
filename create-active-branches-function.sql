-- Create function to get branches that have transactions in a specific date period
CREATE OR REPLACE FUNCTION get_active_branches_for_period(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE(branch_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p."Branch Name"::TEXT
    FROM profit_analysis_view_current p
    WHERE p."Branch Name" != 'SEB VEHICLE'
      AND p."Branch Name" IS NOT NULL
      AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
      AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
    ORDER BY p."Branch Name"::TEXT;
END;
$$ LANGUAGE plpgsql;