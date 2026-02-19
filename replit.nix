{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.nodejs_20
    pkgs.python311Packages.flask
    pkgs.python311Packages.flask-cors
    pkgs.python311Packages.yfinance
    pkgs.python311Packages.pandas
    pkgs.python311Packages.numpy
    pkgs.python311Packages.requests
    pkgs.python311Packages.gunicorn
  ];
}
