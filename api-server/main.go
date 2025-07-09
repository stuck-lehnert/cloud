package main

import (
	"encoding/json"
	"fmt"

	"stuck-lehnert.de/cloud/api/server/config"
	"stuck-lehnert.de/cloud/api/server/database"
	"stuck-lehnert.de/cloud/api/server/resource"
	"stuck-lehnert.de/cloud/api/server/z"
)

func main() {
	db, err := database.Open(config.PostgresDSN())
	if err != nil {
		panic(err)
	}

	if err := db.Migrate("migrations"); err != nil {
		panic(err)
	}

	var User *resource.TableResource
	var Group *resource.TableResource

	Group, err = resource.NewTableResource(resource.TableResourceProps{
		Name:             "Group",
		TableName:        "groups",
		PrimaryKey:       []string{"id"},
		ModifiableFields: []string{"name", "description"},
		StaticFields: map[string]*resource.TableResourceStaticField{
			"id": {
				Type: z.NotNull(z.String()),
			},
			"name": {
				Type: z.NotNull(z.String()),
			},
			"description": {
				Type: z.String(),
			},
			"createdAt": {
				Type:   z.NotNull(z.DateTime()),
				Column: "created_at",
			},
			"modifiedAt": {
				Type:   z.NotNull(z.DateTime()),
				Column: "modified_at",
			},
		},
		References: map[string]*resource.TableResourceReference{},
	})

	if err != nil {
		panic(err)
	}

	User, err = resource.NewTableResource(resource.TableResourceProps{
		Name:             "User",
		TableName:        "users",
		PrimaryKey:       []string{"id"},
		ModifiableFields: []string{"firstName", "lastName", "username", "email"},
		StaticFields: map[string]*resource.TableResourceStaticField{
			"id": {
				Type: z.NotNull(z.String()),
			},
			"firstName": {
				Type:   z.NotNull(z.String()),
				Column: "first_name",
			},
			"lastName": {
				Type:   z.String(),
				Column: "last_name",
			},
			"username": {
				Type: z.String(),
			},
			"email": {
				Type: z.String(),
			},
			"createdAt": {
				Type:   z.NotNull(z.DateTime()),
				Column: "created_at",
			},
			"modifiedAt": {
				Type:   z.NotNull(z.DateTime()),
				Column: "modified_at",
			},
		},
		References: map[string]*resource.TableResourceReference{
			"groups": {
				Resource:      func() *resource.TableResource { return Group },
				JunctionTable: "group_member_users",
				Junction: func(lhs, junc, rhs string) []string {
					return []string{
						fmt.Sprintf(`%s.id = %s.member_user_id`, lhs, junc),
						fmt.Sprintf(`%s.group_id = %s.id`, junc, rhs),
					}
				},
			},
		},
	})

	if err != nil {
		panic(err)
	}

	users, err := User.Attach(db, nil).FindMany(resource.FindManyOpts{
		Where:   map[string]any{"username": "friedrich.merz"},
		Include: []string{"groups"},
	})

	if err != nil {
		panic(err)
	}

	rawJson, err := json.Marshal(users)
	fmt.Println(string(rawJson))

}
