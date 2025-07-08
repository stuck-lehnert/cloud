package z_test

import (
	"testing"

	"stuck-lehnert.de/cloud/api/server/z"
)

func TestInt(t *testing.T) {
	i, err := z.Int().Validate(nil)
	if err != nil {
		t.Errorf("z.Int().Validate(nil) should not error")
	}
	if i != nil {
		t.Errorf("z.Int().Validate(nil) should evaluate nil, got %v", i)
	}

	i, err = z.Int().Validate(10)
	if err != nil {
		t.Errorf("z.Int().Validate(10) should not error")
	}
	if i != int64(10) {
		t.Errorf("z.Int().Validate(10) should evaluate 10, got %v", i)
	}
	if _, ok := i.(int64); !ok {
		t.Errorf("z.Int().Validate(10) should evaluate to int64")
	}

	i, err = z.Int().Validate(uint(10))
	if err != nil {
		t.Errorf("z.Int().Validate(uint(10)) should not error")
	}
	if i != int64(10) {
		t.Errorf("z.Int().Validate(uint(10)) should evaluate 10, got %v", i)
	}
	if _, ok := i.(int64); !ok {
		t.Errorf("z.Int().Validate(uint(10)) should evaluate to int64")
	}

	i, err = z.Int().Validate("10")
	if err != nil {
		t.Errorf("z.Int().Validate(\"10\") should not error")
	}
	if i != int64(10) {
		t.Errorf("z.Int().Validate(\"10\") should evaluate 10, got %v", i)
	}
	if _, ok := i.(int64); !ok {
		t.Errorf("z.Int().Validate(\"10\") should evaluate to int64")
	}

	_, err = z.Int().Validate(map[string]any{})
	if err == nil {
		t.Errorf("z.Int().Validate(map[string]any{}) should error")
	}

	_, err = z.Int().Validate([]any{})
	if err == nil {
		t.Errorf("z.Int().Validate([]any{}) should error")
	}
}
