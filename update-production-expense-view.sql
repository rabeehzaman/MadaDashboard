-- Update expense_details_view to filter out SEB VEHICLE branch
-- Execute this in the production Supabase SQL Editor

CREATE OR REPLACE VIEW expense_details_view AS
SELECT
    CASE
        WHEN (at.transaction_date ~ '^\d{2} \w{3} \d{4}$'::text) THEN to_date(at.transaction_date, 'DD Mon YYYY'::text)
        ELSE NULL::date
    END AS date,
    concat_ws(' | '::text, NULLIF(TRIM(BOTH FROM a.account_name), ''::text), NULLIF(TRIM(BOTH FROM at.description), ''::text),
        CASE
            WHEN (NULLIF(TRIM(BOTH FROM at.reference_number), ''::text) IS NOT NULL) THEN concat('Ref: ', TRIM(BOTH FROM at.reference_number))
            ELSE NULL::text
        END,
        CASE
            WHEN (NULLIF(TRIM(BOTH FROM at.reference_no), ''::text) IS NOT NULL) THEN concat('Ref No: ', TRIM(BOTH FROM at.reference_no))
            ELSE NULL::text
        END) AS description,
        CASE
            WHEN (at.debit_amount ~ '^SAR'::text) THEN (replace(replace(at.debit_amount, 'SAR '::text, ''::text), ','::text, ''::text))::numeric(15,2)
            WHEN (at.transaction_amount_bcy ~ '^SAR'::text) THEN (replace(replace(at.transaction_amount_bcy, 'SAR '::text, ''::text), ','::text, ''::text))::numeric(15,2)
            ELSE 0.00
        END AS amount,
    COALESCE(b.branch_name, 'Unknown Branch'::text) AS branch_name
FROM ((accrual_transactions at
     LEFT JOIN accounts a ON ((at.account_id = a.account_id)))
     LEFT JOIN branch b ON ((at.branch_id = b.branch_id)))
WHERE ((at.entity_type = 'expense'::text) AND (at.debit_or_credit = 'debit'::text) 
       AND (((at.debit_amount ~ '^SAR'::text) AND ((replace(replace(at.debit_amount, 'SAR '::text, ''::text), ','::text, ''::text))::numeric(15,2) > (0)::numeric)) 
            OR ((at.transaction_amount_bcy ~ '^SAR'::text) AND ((replace(replace(at.transaction_amount_bcy, 'SAR '::text, ''::text), ','::text, ''::text))::numeric(15,2) > (0)::numeric)))
       AND COALESCE(b.branch_name, 'Unknown Branch'::text) != 'SEB VEHICLE')
ORDER BY
    CASE
        WHEN (at.transaction_date ~ '^\d{2} \w{3} \d{4}$'::text) THEN to_date(at.transaction_date, 'DD Mon YYYY'::text)
        ELSE NULL::date
    END DESC,
    CASE
        WHEN (at.debit_amount ~ '^SAR'::text) THEN (replace(replace(at.debit_amount, 'SAR '::text, ''::text), ','::text, ''::text))::numeric(15,2)
        WHEN (at.transaction_amount_bcy ~ '^SAR'::text) THEN (replace(replace(at.transaction_amount_bcy, 'SAR '::text, ''::text), ','::text, ''::text))::numeric(15,2)
        ELSE 0.00
    END DESC;

-- Test the updated view
SELECT 'expense_details_view updated successfully' as status;
SELECT COUNT(*) as total_records FROM expense_details_view;
SELECT DISTINCT branch_name FROM expense_details_view ORDER BY branch_name;