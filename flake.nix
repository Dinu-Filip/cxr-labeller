{
  description = "cxr-labeller dev shell (React + Vite frontend, Tauri v2 desktop shell)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # JS toolchain
            nodejs_22

            # Python backend toolchain
            python313
            uv

            # Rust toolchain
            rustc
            cargo
            rustfmt
            clippy
            rust-analyzer

            # Tauri v2 build requirements
            pkg-config
            openssl
            glib
            gtk3
            libsoup_3
            webkitgtk_4_1
            librsvg
            libayatana-appindicator

            # misc tools tauri-cli shells out to
            curl
            wget
            file
          ];

          shellHook = ''
            echo "cxr-labeller dev shell"
            echo "  node:   $(node --version)"
            echo "  rustc:  $(rustc --version)"
            echo "  python: $(python3 --version)"
            echo
            echo "frontend: cd frontend && npm install && npm run tauri dev"
            echo "backend:  cd backend && uv run fastapi dev main.py"
          '';
        };
      });
}
