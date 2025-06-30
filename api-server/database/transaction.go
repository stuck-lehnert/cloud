package database

import (
	"context"
	"database/sql"
	"fmt"
)

func (i *Instance) Transact(callback func(tx *sql.Tx) error) error {
	return i.Use(func(conn *sql.Conn) error {
		tx, err := conn.BeginTx(context.TODO(), &sql.TxOptions{})
		if err != nil {
			return fmt.Errorf("Failed to begin transaction: %v", err)
		}

		committed := false
		defer func() {
			if !committed {
				tx.Rollback()
			}
		}()

		if err := callback(tx); err != nil {
			return err
		}

		if err := tx.Commit(); err != nil {
			return err
		}

		committed = true

		return nil
	})
}
