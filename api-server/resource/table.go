package resource

import (
	"fmt"
	"strings"

	"github.com/huandu/go-sqlbuilder"
	"github.com/samber/lo"
	"maps"
	"stuck-lehnert.de/cloud/api/server/database"
	"stuck-lehnert.de/cloud/api/server/z"
)

type TableResource struct {
	props TableResourceProps

	noRefOutputValidator  *z.ObjectValidator
	outputValidatorFields map[string]z.Validator

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
	References       map[string]*TableResourceReference
	SelectFilter     func(q *sqlbuilder.SelectBuilder, ctx any) error
	UpdateFilter     func(q *sqlbuilder.UpdateBuilder, ctx any) error
	DeleteFilter     func(q *sqlbuilder.UpdateBuilder, ctx any) error
}

type TableResourceStaticField struct {
	Type   z.Validator
	Column string
}

type TableResourceDynamicField struct {
	Type z.Validator
	Expr func(alias string, ctx any) string
}

type TableResourceReference struct {
	Resource func() *TableResource

	Join func(lhs, rhs string) string

	JunctionTable string
	Junction      func(lhs, junc, rhs string) []string
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

	if props.References == nil {
		props.References = map[string]*TableResourceReference{}
	}

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

	for name, definition := range props.References {
		if definition == nil {
			return nil, fmt.Errorf("Definition for reference '%s' is nil, which is not allowed", name)
		}

		if definition.Resource == nil {
			return nil, fmt.Errorf("Definition for reference '%s' is missing the 'Resource' attribute", name)
		}

		if definition.Join == nil && (len(definition.JunctionTable) <= 0 || definition.Junction == nil) {
			return nil, fmt.Errorf("Definition for reference '%s' defines neither a join nor a junction, which is not allowed", name)
		}

		if definition.Join != nil && (len(definition.JunctionTable) > 0 || definition.Junction != nil) {
			return nil, fmt.Errorf("Definition for reference '%s' defines both a join and a junction, which is not allowed", name)
		}

		if err := CheckName(name); err != nil {
			return nil, err
		}

		if err := CheckName(definition.JunctionTable); err != nil {
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

	outputValidatorFieldsCopy := map[string]z.Validator{}
	maps.Copy(outputValidatorFieldsCopy, outputValidatorFields)

	return &TableResource{
		props: props,

		noRefOutputValidator:  z.Object(outputValidatorFields),
		outputValidatorFields: outputValidatorFieldsCopy,

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

type FindManyOpts struct {
	Where   map[string]any
	Include []string
	Search  string
}

func (atr *AttachedTableResource) FindMany(opts FindManyOpts) ([]map[string]any, error) {
	if opts.Where == nil {
		opts.Where = map[string]any{}
	}

	if opts.Include == nil {
		opts.Include = []string{}
	}

	parsedWhere, err := z.Validate[map[string]any](atr.manyWhereValidator, opts.Where)
	if err != nil {
		return nil, fmt.Errorf("Invalid where input for '%s'.FindMany(..): %v", atr.props.Name, err)
	}

	q := sqlbuilder.Select().From(fmt.Sprintf(`"%s" AS "main"`, atr.props.TableName))

	for name, definition := range atr.props.StaticFields {
		q.SelectMore(fmt.Sprintf(`"main"."%s" AS "%s"`, definition.Column, name))
	}

	for key, value := range parsedWhere {
		q.Where(fmt.Sprintf(`"main"."%s" = %s`, key, q.Var(value)))
	}

	validatorFields := map[string]z.Validator{}
	maps.Copy(validatorFields, atr.outputValidatorFields)

	aliasCounter := 0
	for _, included := range opts.Include {
		reference, ok := atr.props.References[included]
		if !ok {
			return nil, fmt.Errorf("'%s'.FindMany(..): Tried to include reference '%s', which does not exist", atr.props.Name, included)
		}

		resource := reference.Resource()

		targetAlias := fmt.Sprintf(`"j%v"`, aliasCounter)
		aliasCounter += 1

		if reference.Join != nil {
			condition := reference.Join(`"main"`, targetAlias)
			q.JoinWithOption(
				sqlbuilder.LeftJoin,
				fmt.Sprintf(`"%s" AS %s`, resource.props.TableName, targetAlias),
				condition,
			)
		} else {
			junctionAlias := fmt.Sprintf(`"j%v"`, aliasCounter)
			aliasCounter += 1

			conditions := reference.Junction(`"main"`, junctionAlias, targetAlias)
			if len(conditions) != 2 {
				return nil, fmt.Errorf("'%s'.FindMany(..): junction for reference '%s' did not return 2 conditions", atr.props.Name, included)
			}

			q.JoinWithOption(
				sqlbuilder.LeftJoin,
				fmt.Sprintf(`"%s" AS %s`, reference.JunctionTable, junctionAlias),
				conditions[0],
			)

			q.JoinWithOption(
				sqlbuilder.LeftJoin,
				fmt.Sprintf(`"%s" AS %s`, resource.props.TableName, targetAlias),
				conditions[1],
			)
		}

		jsonbBuildArgs := []string{}
		for name, definition := range resource.props.StaticFields {
			jsonbBuildArgs = append(
				jsonbBuildArgs,
				fmt.Sprintf("'%s'", name),
				fmt.Sprintf(`%s."%s"`, targetAlias, definition.Column),
			)
		}

		for name, definition := range resource.props.DynamicFields {
			jsonbBuildArgs = append(
				jsonbBuildArgs,
				fmt.Sprintf("'%s'", name),
				definition.Expr(targetAlias, atr.ctx),
			)
		}

		q.SelectMore(
			fmt.Sprintf(
				`array_agg(jsonb_build_object(%s)) AS "%s"`,
				strings.Join(jsonbBuildArgs, ", "),
				included,
			),
		)

		validatorFields[included] = z.NotNull(z.Array(resource.noRefOutputValidator))
	}

	for _, attr := range atr.props.PrimaryKey {
		q.GroupBy(fmt.Sprintf(`"main"."%s"`, attr))
	}

	rows, err := atr.db.QueryAsJson(q)
	if err != nil {
		return nil, fmt.Errorf("'%s'.FindMany(..) failed to query database: %v", atr.props.Name, err)
	}

	for i := range rows {
		rows[i], err = z.Validate[map[string]any](z.Object(validatorFields), rows[i])
		if err != nil {
			return nil, fmt.Errorf("'%s'.FindMany(..) failed to validate results: %v", atr.props.Name, err)
		}
	}

	return rows, nil
}
