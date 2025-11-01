{
  description = "n8n CalDAV node with Radicale test server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
  };

  outputs = inputs @ {
    flake-parts,
    nixpkgs,
    ...
  }:
    flake-parts.lib.mkFlake {inherit inputs;} {
      systems = ["x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin"];

      perSystem = {
        config,
        pkgs,
        system,
        ...
      }: {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            nodePackages.npm
            radicale
            apacheHttpd
          ];

          shellHook = ''
            echo "n8n CalDAV Node Development Environment"
            echo "Available: radicale, htpasswd, node, npm"
          '';
        };

        formatter = pkgs.alejandra;
      };
    };
}
