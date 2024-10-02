data.json: books.yaml
	yq -o json books.yaml > data.json
