"""Mint a reviewer bearer token. The token is printed once and never stored."""

import argparse
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from auth import hash_token, new_token
from db import SessionLocal
from models import Reviewer


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    issue = sub.add_parser("issue", help="create a reviewer and print its token")
    issue.add_argument("--name", required=True)
    issue.add_argument(
        "--expires-days",
        type=int,
        default=None,
        help="token lifetime in days; omit for no expiry",
    )

    sub.add_parser("list", help="list reviewers and their token status")

    revoke = sub.add_parser("revoke", help="revoke a reviewer's token")
    revoke.add_argument("--name", required=True)

    args = parser.parse_args()

    with SessionLocal() as db:
        if args.command == "issue":
            if db.scalar(select(Reviewer).where(Reviewer.name == args.name)):
                print(f"reviewer {args.name!r} already exists", file=sys.stderr)
                raise SystemExit(1)

            token = new_token()
            expires_at = (
                datetime.now(timezone.utc) + timedelta(days=args.expires_days)
                if args.expires_days
                else None
            )
            db.add(
                Reviewer(
                    name=args.name,
                    token_hash=hash_token(token),
                    expires_at=expires_at,
                )
            )
            db.commit()
            print(f"reviewer: {args.name}")
            print(f"token:    {token}")
            print(
                "\nStore this now - only its hash is kept, so it cannot be shown again."
            )

        elif args.command == "list":
            for reviewer in db.scalars(select(Reviewer).order_by(Reviewer.id)):
                state = "revoked" if reviewer.revoked_at else "active"
                expiry = (
                    reviewer.expires_at.isoformat() if reviewer.expires_at else "never"
                )
                print(f"{reviewer.id}\t{reviewer.name}\t{state}\texpires: {expiry}")

        elif args.command == "revoke":
            reviewer = db.scalar(select(Reviewer).where(Reviewer.name == args.name))
            if reviewer is None:
                print(f"no reviewer named {args.name!r}", file=sys.stderr)
                raise SystemExit(1)
            reviewer.revoked_at = datetime.now(timezone.utc)
            db.commit()
            print(f"revoked {args.name}")


if __name__ == "__main__":
    main()
