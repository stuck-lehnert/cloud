package resource

import (
	"fmt"

	"github.com/Oudwins/zog"
	"github.com/huandu/go-sqlbuilder"
	"stuck-lehnert.de/cloud/api/server/database"
)

type TableResource struct {
	props TableResourceProps

	outputSchema      zog.ComplexZogSchema
	uniqueWhereSchema zog.ComplexZogSchema
	manyWhereSchema   zog.ComplexZogSchema
	createInputSchema zog.ComplexZogSchema
	modifyInputSchema zog.ComplexZogSchema
}

type TableResourceProps struct {
	Name             string
	TableName        string
	PrimaryKey       []string
	CreateOnlyFields []string
	ModifiableFields []string
	StaticFields     map[string]*TableResourceStaticField
	DynamicFields    map[string]*TableResourceDynamicField
	// Joins            map[string]*TableResourceJoin
	SelectFilter func(q *sqlbuilder.SelectBuilder, ctx any) error
	UpdateFilter func(q *sqlbuilder.UpdateBuilder, ctx any) error
}

type TableResourceStaticField struct {
	Type   zog.ZogSchema
	Column string
}

type TableResourceDynamicField struct {
	Type zog.ZogSchema
	Expr func(alias string, ctx any) string
}

type TableResourceJoin struct {
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
			return nil, fmt.Errorf("Primary references static field '%s', which is not defined", field)
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

	return &TableResource{
		props: props,
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
	var parsedWhere map[string]any
	issueMap := atr.uniqueWhereSchema.Parse(where, &parsedWhere)
	if len(issueMap) > 0 {
		return nil, fmt.Errorf("Invalid where input for '%s'.FindUnique(..)", atr.props.Name)
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

	maps, err := atr.db.QueryMaps(q)
	if err != nil {
		return nil, fmt.Errorf("'%s'.FindUnique(..) failed to query database: %v", atr.props.Name, err)
	}

	if len(maps) <= 0 {
		return nil, nil
	}

	return maps[0], nil
}

func (atr *AttachedTableResource) FindMany(where map[string]any) ([]map[string]any, error) {
	var parsedWhere map[string]any
	issueMap := atr.manyWhereSchema.Parse(where, &parsedWhere)
	if len(issueMap) > 0 {
		return nil, fmt.Errorf("Invalid where input for '%s'.FindMany(..)", atr.props.Name)
	}

	columns := []string{}
	for name, definition := range atr.props.StaticFields {
		columns = append(columns, fmt.Sprintf(`"main"."%s" AS "%s"`, definition.Column, name))
	}

	q := sqlbuilder.Select(columns...).From(fmt.Sprintf(`"%s" AS "main"`, atr.props.TableName))

	for key, value := range parsedWhere {
		q.Where(fmt.Sprintf(`"main"."%s" = %s`, key, q.Var(value)))
	}

	maps, err := atr.db.QueryMaps(q)
	if err != nil {
		return nil, fmt.Errorf("'%s'.FindMany(..) failed to query database: %v", atr.props.Name, err)
	}

	return maps, nil
}
