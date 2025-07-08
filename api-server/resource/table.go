package resource

import (
	"fmt"

	"github.com/huandu/go-sqlbuilder"
	"github.com/samber/lo"
	"stuck-lehnert.de/cloud/api/server/database"
	"stuck-lehnert.de/cloud/api/server/z"
)

type TableResource struct {
	props TableResourceProps

	outputValidator      *z.ObjectValidator
	uniqueWhereValidator *z.ObjectValidator
	manyWhereValidator   *z.ObjectValidator
	createInputValidator *z.ObjectValidator
	modifyInputValidator *z.ObjectValidator
}

type TableResourceProps struct {
	Name             string
	TableName        string
	PrimaryKey       []string
	CreateOnlyFields []string
	ModifiableFields []string
	StaticFields     map[string]*TableResourceStaticField
	DynamicFields    map[string]*TableResourceDynamicField
	References       map[string]any
	// Joins            map[string]*TableResourceJoin
	SelectFilter func(q *sqlbuilder.SelectBuilder, ctx any) error
	UpdateFilter func(q *sqlbuilder.UpdateBuilder, ctx any) error
}

type TableResourceStaticField struct {
	Type   z.Validator
	Column string
}

type TableResourceDynamicField struct {
	Type z.Validator
	Expr func(alias string, ctx any) (string, []any)
}

type TableResourceReference struct {
	Resource func() *TableResource
	Join     func(lhs, rhs string) (string, []any)

	Junction func()
}

func NewTableResource(props TableResourceProps) (*TableResource, error) {
	if len(props.Name) <= 0 {
		return nil, fmt.Errorf("TableResourceProps.Name must not be empty")
	}

	if len(props.TableName) <= 0 {
		return nil, fmt.Errorf("TableResourceProps.TableName must not be empty")
	}

	if len(props.PrimaryKey) <= 0 {
		return nil, fmt.Errorf("TableResourceProps.Primary must not be empty")
	}

	if len(props.StaticFields) <= 0 {
		return nil, fmt.Errorf("Every table resource should have at least 1 static field")
	}

	if err := CheckName(props.Name); err != nil {
		return nil, err
	}

	if err := CheckName(props.TableName); err != nil {
		return nil, err
	}

	if props.DynamicFields == nil {
		props.DynamicFields = map[string]*TableResourceDynamicField{}
	}

	if props.CreateOnlyFields == nil {
		props.CreateOnlyFields = []string{}
	}

	if props.ModifiableFields == nil {
		props.ModifiableFields = []string{}
	}

	// if props.Joins == nil {
	// 	props.Joins = map[string]*TableResourceJoin{}
	// }

	if props.SelectFilter == nil {
		props.SelectFilter = func(q *sqlbuilder.SelectBuilder, ctx any) error { return nil }
	}

	if props.UpdateFilter == nil {
		props.UpdateFilter = func(q *sqlbuilder.UpdateBuilder, ctx any) error { return nil }
	}

	for _, field := range props.PrimaryKey {
		_, found := props.StaticFields[field]
		if !found {
			return nil, fmt.Errorf("Primary key references static field '%s', which is not defined", field)
		}
	}

	for _, field := range props.CreateOnlyFields {
		_, found := props.StaticFields[field]
		if !found {
			return nil, fmt.Errorf("Create only set references static field '%s', which is not defined", field)
		}

		if _, found := lo.Find(props.ModifiableFields, func(f string) bool { return f == field }); found {
			return nil, fmt.Errorf("Create only field '%s' is tagged as modifiable, which is not allowed", field)
		}
	}

	for _, field := range props.ModifiableFields {
		_, found := props.StaticFields[field]
		if !found {
			return nil, fmt.Errorf("Modifiable set references static field '%s', which is not defined", field)
		}
	}

	for name, definition := range props.StaticFields {
		if definition == nil {
			return nil, fmt.Errorf("Definition for static field '%s' is nil, which is not allowed", name)
		}

		if definition.Type == nil {
			return nil, fmt.Errorf("Definition for static field '%s' is missing the 'Type' attribute", name)
		}

		if len(definition.Column) <= 0 {
			definition.Column = name
		}

		if err := CheckName(name); err != nil {
			return nil, err
		}

		if err := CheckName(definition.Column); err != nil {
			return nil, err
		}

		if _, found := props.DynamicFields[name]; found {
			return nil, fmt.Errorf("Field '%s' is defined more than once, which is not allowed", name)
		}
	}

	for name, definition := range props.DynamicFields {
		if definition == nil {
			return nil, fmt.Errorf("Definition for dynamic field '%s' is nil, which is not allowed", name)
		}

		if definition.Type == nil {
			return nil, fmt.Errorf("Definition for dynamic field '%s' is missing the 'Type' attribute", name)
		}

		if definition.Expr == nil {
			return nil, fmt.Errorf("Definition for dynamic field '%s' is missing the 'Expr' attribute", name)
		}

		if err := CheckName(name); err != nil {
			return nil, err
		}
	}

	uniqueWhereValidatorFields := map[string]z.Validator{}
	for _, attr := range props.PrimaryKey {
		staticField := props.StaticFields[attr]
		uniqueWhereValidatorFields[attr] = staticField.Type
	}

	outputValidatorFields := map[string]z.Validator{}
	manyWhereValidatorFields := map[string]z.Validator{}

	for attr, fieldDef := range props.StaticFields {
		outputValidatorFields[attr] = fieldDef.Type
		manyWhereValidatorFields[attr] = z.Optional(fieldDef.Type)
	}

	for attr, fieldDef := range props.DynamicFields {
		outputValidatorFields[attr] = fieldDef.Type
	}

	createInputValidatorFields := map[string]z.Validator{}
	modifyInputValidatorFields := map[string]z.Validator{}

	for _, attr := range props.ModifiableFields {
		staticField := props.StaticFields[attr]
		createInputValidatorFields[attr] = staticField.Type
		modifyInputValidatorFields[attr] = z.Optional(staticField.Type)
	}

	for _, attr := range props.CreateOnlyFields {
		staticField := props.StaticFields[attr]
		createInputValidatorFields[attr] = staticField.Type
	}

	return &TableResource{
		props: props,

		outputValidator:      z.Object(outputValidatorFields),
		uniqueWhereValidator: z.Object(uniqueWhereValidatorFields),
		manyWhereValidator:   z.Object(manyWhereValidatorFields),
		createInputValidator: z.Object(createInputValidatorFields),
		modifyInputValidator: z.Object(modifyInputValidatorFields),
	}, nil
}

type AttachedTableResource struct {
	*TableResource
	db  *database.Instance
	ctx any
}

func (tr *TableResource) Attach(db *database.Instance, ctx any) *AttachedTableResource {
	return &AttachedTableResource{tr, db, ctx}
}

// returns (nil, nil), iff no resource has been found;
// returns (res, nil) on success and (nil, err) on error
func (atr *AttachedTableResource) FindUnique(where map[string]any) (map[string]any, error) {
	if where == nil {
		where = map[string]any{}
	}

	parsedWhere, err := z.Validate[map[string]any](atr.uniqueWhereValidator, where)
	if err != nil {
		return nil, fmt.Errorf("Invalid where input for '%s'.FindUnique(..): %v", atr.props.Name, err)
	}

	columns := []string{}
	for name, definition := range atr.props.StaticFields {
		columns = append(columns, fmt.Sprintf(`"main"."%s" AS "%s"`, definition.Column, name))
	}

	q := sqlbuilder.Select(columns...).From(fmt.Sprintf(`"%s" AS "main"`, atr.props.TableName))

	for key, value := range parsedWhere {
		q.Where(fmt.Sprintf(`"main"."%s" = %s`, key, q.Var(value)))
	}

	q.Limit(1)

	rows, err := atr.db.QueryAsJson(q)
	if err != nil {
		return nil, fmt.Errorf("'%s'.FindUnique(..) failed to query database: %v", atr.props.Name, err)
	}

	if len(rows) <= 0 {
		return nil, nil
	}

	return rows[0], nil
}

func (atr *AttachedTableResource) FindMany(where map[string]any) ([]map[string]any, error) {
	if where == nil {
		where = map[string]any{}
	}

	parsedWhere, err := z.Validate[map[string]any](atr.manyWhereValidator, where)
	if err != nil {
		return nil, fmt.Errorf("Invalid where input for '%s'.FindMany(..): %v", atr.props.Name, err)
	}

	columns := []string{}
	for name, definition := range atr.props.StaticFields {
		columns = append(columns, fmt.Sprintf(`"main"."%s" AS "%s"`, definition.Column, name))
	}

	q := sqlbuilder.Select(columns...).From(fmt.Sprintf(`"%s" AS "main"`, atr.props.TableName))

	for key, value := range parsedWhere {
		q.Where(fmt.Sprintf(`"main"."%s" = %s`, key, q.Var(value)))
	}

	rows, err := atr.db.QueryAsJson(q)
	if err != nil {
		return nil, fmt.Errorf("'%s'.FindMany(..) failed to query database: %v", atr.props.Name, err)
	}

	for i := range rows {
		rows[i], err = z.Validate[map[string]any](atr.outputValidator, rows[i])
		if err != nil {
			return nil, fmt.Errorf("'%s'.FindMany(..) failed to validate results: %v", atr.props.Name, err)
		}
	}

	return rows, nil
}
