package z

import (
	"fmt"
	"reflect"
	"time"
)

var _ Validator = &DateTimeValidator{}

type DateTimeValidator struct {
	min func() time.Time
	max func() time.Time
}

func DateTime() *DateTimeValidator {
	return &DateTimeValidator{}
}

func (v *DateTimeValidator) Min(min time.Time) *DateTimeValidator {
	v.min = func() time.Time { return min }
	return v
}

func (v *DateTimeValidator) Max(max time.Time) *DateTimeValidator {
	v.max = func() time.Time { return max }
	return v
}

func parseAnyTime(str string) *time.Time {
	formats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		time.Layout,
		time.ANSIC,
		time.UnixDate,
		time.RubyDate,
		time.RFC822,
		time.RFC822Z,
		time.RFC850,
		time.RFC1123,
		time.RFC1123Z,
	}

	for _, format := range formats {
		t, err := time.Parse(format, str)
		if err == nil {
			return &t
		}
	}

	return nil
}

func (v *DateTimeValidator) Validate(value any) (any, error) {
	if value == nil {
		return nil, nil
	}

	d, err := (func() (time.Time, error) {
		switch value.(type) {
		case time.Time:
			return value.(time.Time), nil
		case string:
			t := parseAnyTime(value.(string))
			if t != nil {
				return *t, nil
			}

			return time.Time{}, fmt.Errorf("value is no parseable timestamp")
		}

		rv := reflect.ValueOf(value)
		if rv.CanInt() || rv.CanUint() {
			var i int64
			if rv.CanUint() {
				i = int64(rv.Uint())
			} else {
				i = rv.Int()
			}

			return time.Unix(i, 0), nil
		}

		return time.Time{}, fmt.Errorf("value is not convertable to timestamp")
	})()

	if err != nil {
		return nil, err
	}

	return d, nil
}

func (v *DateTimeValidator) TypeName() string {
	return "DateTime"
}
