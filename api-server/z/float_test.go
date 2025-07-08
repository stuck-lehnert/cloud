package z_test

import (
	"testing"

	"stuck-lehnert.de/cloud/api/server/z"
)

func TestFloat(t *testing.T) {
	f, err := z.Float().Validate(nil)
	if err != nil {
		t.Errorf("z.Float().Validate(nil) should not error")
	}
	if f != nil {
		t.Errorf("z.Float().Validate(nil) should evaluate nil, got %v", f)
	}

	f, err = z.Float().Validate(10)
	if err != nil {
		t.Errorf("z.Float().Validate(10) should not error")
	}
	if f != 10.0 {
		t.Errorf("z.Float().Validate(10) should evaluate 10.0, got %v", f)
	}
	if _, ok := f.(float64); !ok {
		t.Errorf("z.Float().Validate(10) should evaluate to float64")
	}

	f, err = z.Float().Validate(uint(10))
	if err != nil {
		t.Errorf("z.Float().Validate(uint(10)) should not error")
	}
	if f != 10.0 {
		t.Errorf("z.Float().Validate(uint(10)) should evaluate 10.0, got %v", f)
	}
	if _, ok := f.(float64); !ok {
		t.Errorf("z.Float().Validate(uint(10)) should evaluate to float64")
	}

	f, err = z.Float().Validate("10")
	if err != nil {
		t.Errorf("z.Float().Validate(\"10\") should not error")
	}
	if f != 10.0 {
		t.Errorf("z.Float().Validate(\"10\") should evaluate 10.0, got %v", f)
	}
	if _, ok := f.(float64); !ok {
		t.Errorf("z.Float().Validate(\"10\") should evaluate to float64")
	}

	_, err = z.Float().Validate(map[string]any{})
	if err == nil {
		t.Errorf("z.Float().Validate(map[string]any{}) should error")
	}

	_, err = z.Float().Validate([]any{})
	if err == nil {
		t.Errorf("z.Float().Validate([]any{}) should error")
	}
}
