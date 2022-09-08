import { suite } from 'uvu';
import * as assert from 'uvu/assert';

import * as $exports from '../src';

function pass(pkg, expects, ...args) {
	let out = $exports.resolve(pkg, ...args);
	assert.is(out, expects);
}

function fail(pkg, target, ...args) {
	try {
		$exports.resolve(pkg, ...args);
		assert.unreachable();
	} catch (err) {
		assert.instance(err, Error);
		assert.is(err.message, `Missing "${target}" export in "${pkg.name}" package`);
	}
}

// ---

const resolve = suite('$.resolve');

resolve('should be a function', () => {
	assert.type($exports.resolve, 'function');
});

resolve('exports=string', () => {
	let pkg = {
		"name": "foobar",
		"exports": "$string",
	};

	pass(pkg, '$string');
	pass(pkg, '$string', '.');
	pass(pkg, '$string', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports = { self }', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"import": "$import",
			"require": "$require",
		}
	};

	pass(pkg, '$import');
	pass(pkg, '$import', '.');
	pass(pkg, '$import', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["."] = string', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": "$self",
		}
	};

	pass(pkg, '$self');
	pass(pkg, '$self', '.');
	pass(pkg, '$self', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["."] = object', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": {
				"import": "$import",
				"require": "$require",
			}
		}
	};

	pass(pkg, '$import');
	pass(pkg, '$import', '.');
	pass(pkg, '$import', 'foobar');

	fail(pkg, './other', 'other');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './hello', './hello');
});

resolve('exports["./foo"] = string', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./foo": "$import",
		}
	};

	pass(pkg, '$import', './foo');
	pass(pkg, '$import', 'foobar/foo');

	fail(pkg, '.');
	fail(pkg, '.', 'foobar');
	fail(pkg, './other', 'foobar/other');
});

resolve('exports["./foo"] = object', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./foo": {
				"import": "$import",
				"require": "$require",
			}
		}
	};

	pass(pkg, '$import', './foo');
	pass(pkg, '$import', 'foobar/foo');

	fail(pkg, '.');
	fail(pkg, '.', 'foobar');
	fail(pkg, './other', 'foobar/other');
});

// https://nodejs.org/api/packages.html#packages_nested_conditions
resolve('nested conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"node": {
				"import": "$node.import",
				"require": "$node.require"
			},
			"default": "$default",
		}
	};

	pass(pkg, '$node.import');
	pass(pkg, '$node.import', 'foobar');

	// browser => no "node" key
	pass(pkg, '$default', '.', { browser: true });
	pass(pkg, '$default', 'foobar', { browser: true });

	fail(pkg, './hello', './hello');
	fail(pkg, './other', 'foobar/other');
	fail(pkg, './other', 'other');
});

resolve('nested conditions :: subpath', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./lite": {
				"node": {
					"import": "$node.import",
					"require": "$node.require"
				},
				"browser": {
					"import": "$browser.import",
					"require": "$browser.require"
				},
			}
		}
	};

	pass(pkg, '$node.import', 'foobar/lite');
	pass(pkg, '$node.require', 'foobar/lite', { require: true });

	pass(pkg, '$browser.import', 'foobar/lite', { browser: true });
	pass(pkg, '$browser.require', 'foobar/lite', { browser: true, require: true });
});

resolve('nested conditions :: subpath :: inverse', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./lite": {
				"import": {
					"browser": "$browser.import",
					"node": "$node.import",
				},
				"require": {
					"browser": "$browser.require",
					"node": "$node.require",
				}
			}
		}
	};

	pass(pkg, '$node.import', 'foobar/lite');
	pass(pkg, '$node.require', 'foobar/lite', { require: true });

	pass(pkg, '$browser.import', 'foobar/lite', { browser: true });
	pass(pkg, '$browser.require', 'foobar/lite', { browser: true, require: true });
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": {
				"require": "$require",
				"import": "$import"
			},
			"./package.json": "./package.json",
			"./": "./"
		}
	};

	pass(pkg, '$import');
	pass(pkg, '$import', 'foobar');
	pass(pkg, '$require', 'foobar', { require: true });

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// "loose" / everything exposed
	pass(pkg, './hello.js', 'hello.js');
	pass(pkg, './hello.js', 'foobar/hello.js');
	pass(pkg, './hello/world.js', './hello/world.js');
});

resolve('exports["./"] :: w/o "." key', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./package.json": "./package.json",
			"./": "./"
		}
	};

	fail(pkg, '.', ".");
	fail(pkg, '.', "foobar");

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// "loose" / everything exposed
	pass(pkg, './hello.js', 'hello.js');
	pass(pkg, './hello.js', 'foobar/hello.js');
	pass(pkg, './hello/world.js', './hello/world.js');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./*"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./*": "./cheese/*.mjs"
		}
	};

	fail(pkg, '.', ".");
	fail(pkg, '.', "foobar");

	pass(pkg, './cheese/hello.mjs', 'hello');
	pass(pkg, './cheese/hello.mjs', 'foobar/hello');
	pass(pkg, './cheese/hello/world.mjs', './hello/world');

	// evaluate as defined, not wrong
	pass(pkg, './cheese/hello.js.mjs', 'hello.js');
	pass(pkg, './cheese/hello.js.mjs', 'foobar/hello.js');
	pass(pkg, './cheese/hello/world.js.mjs', './hello/world.js');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/": "./features/"
		}
	};

	pass(pkg, './features/', 'features/');
	pass(pkg, './features/', 'foobar/features/');

	pass(pkg, './features/hello.js', 'foobar/features/hello.js');

	fail(pkg, './features', 'features');
	fail(pkg, './features', 'foobar/features');

	fail(pkg, './package.json', 'package.json');
	fail(pkg, './package.json', 'foobar/package.json');
	fail(pkg, './package.json', './package.json');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/"] :: with "./" key', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/": "./features/",
			"./package.json": "./package.json",
			"./": "./"
		}
	};

	pass(pkg, './features', 'features'); // via "./"
	pass(pkg, './features', 'foobar/features'); // via "./"

	pass(pkg, './features/', 'features/'); // via "./features/"
	pass(pkg, './features/', 'foobar/features/'); // via "./features/"

	pass(pkg, './features/hello.js', 'foobar/features/hello.js');

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// Does NOT hit "./" (match Node)
	fail(pkg, '.', '.');
	fail(pkg, '.', 'foobar');
});

resolve('exports["./features/"] :: conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/": {
				"browser": {
					"import": "./browser.import/",
					"require": "./browser.require/",
				},
				"import": "./import/",
				"require": "./require/",
			},
		}
	};

	// import
	pass(pkg, './import/', 'features/');
	pass(pkg, './import/', 'foobar/features/');

	pass(pkg, './import/hello.js', './features/hello.js');
	pass(pkg, './import/hello.js', 'foobar/features/hello.js');

	// require
	pass(pkg, './require/', 'features/', { require: true });
	pass(pkg, './require/', 'foobar/features/', { require: true });

	pass(pkg, './require/hello.js', './features/hello.js', { require: true });
	pass(pkg, './require/hello.js', 'foobar/features/hello.js', { require: true });

	// require + browser
	pass(pkg, './browser.require/', 'features/', { browser: true, require: true });
	pass(pkg, './browser.require/', 'foobar/features/', { browser: true, require: true });

	pass(pkg, './browser.require/hello.js', './features/hello.js', { browser: true, require: true });
	pass(pkg, './browser.require/hello.js', 'foobar/features/hello.js', { browser: true, require: true });
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/*"]', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/*": "./features/*.js",
		}
	};

	fail(pkg, './features', 'features');
	fail(pkg, './features', 'foobar/features');

	fail(pkg, './features/', 'features/');
	fail(pkg, './features/', 'foobar/features/');

	pass(pkg, './features/a.js', 'foobar/features/a');
	pass(pkg, './features/ab.js', 'foobar/features/ab');
	pass(pkg, './features/abc.js', 'foobar/features/abc');

	pass(pkg, './features/hello.js', 'foobar/features/hello');
	pass(pkg, './features/world.js', 'foobar/features/world');

	// incorrect, but matches Node. evaluate as defined
	pass(pkg, './features/hello.js.js', 'foobar/features/hello.js');
	pass(pkg, './features/world.js.js', 'foobar/features/world.js');

	fail(pkg, './package.json', 'package.json');
	fail(pkg, './package.json', 'foobar/package.json');
	fail(pkg, './package.json', './package.json');
});

// https://nodejs.org/api/packages.html#packages_subpath_folder_mappings
resolve('exports["./features/*"] :: with "./" key', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/*": "./features/*.js",
			"./": "./"
		}
	};

	pass(pkg, './features', 'features'); // via "./"
	pass(pkg, './features', 'foobar/features'); // via "./"

	pass(pkg, './features/', 'features/'); // via "./"
	pass(pkg, './features/', 'foobar/features/'); // via "./"

	pass(pkg, './features/hello.js', 'foobar/features/hello');
	pass(pkg, './features/world.js', 'foobar/features/world');

	// incorrect, but matches Node. evaluate as defined
	pass(pkg, './features/hello.js.js', 'foobar/features/hello.js');
	pass(pkg, './features/world.js.js', 'foobar/features/world.js');

	pass(pkg, './package.json', 'package.json');
	pass(pkg, './package.json', 'foobar/package.json');
	pass(pkg, './package.json', './package.json');

	// Does NOT hit "./" (match Node)
	fail(pkg, '.', '.');
	fail(pkg, '.', 'foobar');
});

resolve('exports["./features/*"] :: conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			"./features/*": {
				"browser": {
					"import": "./browser.import/*.mjs",
					"require": "./browser.require/*.js",
				},
				"import": "./import/*.mjs",
				"require": "./require/*.js",
			},
		}
	};

	// import
	fail(pkg, './features/', 'features/'); // no file
	fail(pkg, './features/', 'foobar/features/'); // no file

	pass(pkg, './import/hello.mjs', './features/hello');
	pass(pkg, './import/hello.mjs', 'foobar/features/hello');

	// require
	fail(pkg, './features/', 'features/', { require: true }); // no file
	fail(pkg, './features/', 'foobar/features/', { require: true }); // no file

	pass(pkg, './require/hello.js', './features/hello', { require: true });
	pass(pkg, './require/hello.js', 'foobar/features/hello', { require: true });

	// require + browser
	fail(pkg, './features/', 'features/', { browser: true, require: true }); // no file
	fail(pkg, './features/', 'foobar/features/', { browser: true, require: true }); // no file

	pass(pkg, './browser.require/hello.js', './features/hello', { browser: true, require: true });
	pass(pkg, './browser.require/hello.js', 'foobar/features/hello', { browser: true, require: true });
});

resolve('should handle mixed path/conditions', () => {
	let pkg = {
		"name": "foobar",
		"exports": {
			".": [
				{
					"import": "$root.import",
				},
				"$root.string"
			],
			"./foo": [
				{
					"require": "$foo.require"
				},
				"$foo.string"
			]
		}
	}

	pass(pkg, '$root.import');
	pass(pkg, '$root.import', 'foobar');

	pass(pkg, '$foo.string', 'foo');
	pass(pkg, '$foo.string', 'foobar/foo');
	pass(pkg, '$foo.string', './foo');

	pass(pkg, '$foo.require', 'foo', { require: true });
	pass(pkg, '$foo.require', 'foobar/foo', { require: true });
	pass(pkg, '$foo.require', './foo', { require: true });
});

resolve('should handle files with dot', () => {
	let pkg = {
		name: "aws-cdk-lib",
		version: "2.41.0",
		description: "Version 2 of the AWS Cloud Development Kit library",
		main: "index.js",
		types: "index.d.ts",
		repository: {
			type: "git",
			url: "https://github.com/aws/aws-cdk.git",
			directory: "packages/aws-cdk-lib",
		},
		stability: "stable",
		maturity: "stable",
		scripts: {
			gen: "ubergen",
			build: "cdk-build",
			lint: "cdk-lint",
			test: "echo done",
			package: "cdk-package",
			pkglint: "pkglint -f",
			"build+test": "yarn build && yarn test",
			"build+test+package": "yarn build+test && yarn package",
			watch: "cdk-watch",
			compat: "cdk-compat",
			"rosetta:extract": "yarn --silent jsii-rosetta extract",
			"build+extract": "yarn build && yarn rosetta:extract",
			"build+test+extract": "yarn build+test && yarn rosetta:extract",
		},
		awslint: { exclude: ["*:*"] },
		"cdk-build": {
			eslint: { disable: true },
			stripDeprecated: true,
			compressAssembly: true,
			post: [
				"node ./scripts/verify-imports-resolve-same.js",
				"node ./scripts/verify-imports-shielded.js",
				"/bin/bash ./scripts/minify-sources.sh",
			],
		},
		"cdk-package": { post: "node ./scripts/verify-stripped-exp.js" },
		pkglint: {
			exclude: [
				"package-info/maturity",
				"jsii/java",
				"jsii/python",
				"jsii/dotnet",
			],
			attribution: ["kubectl", "helm"],
		},
		jsii: {
			excludeTypescript: ["build-tools/*"],
			outdir: "dist",
			targets: {
				dotnet: {
					namespace: "Amazon.CDK",
					packageId: "Amazon.CDK.Lib",
					iconUrl:
						"https://raw.githubusercontent.com/aws/aws-cdk/main/logo/default-256-dark.png",
				},
				java: {
					package: "software.amazon.awscdk",
					maven: {
						groupId: "software.amazon.awscdk",
						artifactId: "aws-cdk-lib",
					},
				},
				python: { distName: "aws-cdk-lib", module: "aws_cdk" },
				go: { moduleName: "github.com/aws/aws-cdk-go", packageName: "awscdk" },
			},
			projectReferences: false,
		},
		author: {
			name: "Amazon Web Services",
			url: "https://aws.amazon.com",
			organization: true,
		},
		license: "Apache-2.0",
		bundledDependencies: [
			"@balena/dockerignore",
			"case",
			"fs-extra",
			"ignore",
			"jsonschema",
			"minimatch",
			"punycode",
			"semver",
			"yaml",
		],
		dependencies: {
			"@balena/dockerignore": "^1.0.2",
			case: "1.6.3",
			"fs-extra": "^9.1.0",
			ignore: "^5.2.0",
			jsonschema: "^1.4.1",
			minimatch: "^3.1.2",
			punycode: "^2.1.1",
			semver: "^7.3.7",
			yaml: "1.10.2",
		},
		devDependencies: {
			"@aws-cdk/alexa-ask": "2.41.0",
			"@aws-cdk/app-delivery": "2.41.0",
			"@aws-cdk/assertions": "2.41.0",
			"@aws-cdk/assets": "2.41.0",
			"@aws-cdk/aws-accessanalyzer": "2.41.0",
			"@aws-cdk/aws-acmpca": "2.41.0",
			"@aws-cdk/aws-amazonmq": "2.41.0",
			"@aws-cdk/aws-amplify": "2.41.0",
			"@aws-cdk/aws-amplifyuibuilder": "2.41.0",
			"@aws-cdk/aws-apigateway": "2.41.0",
			"@aws-cdk/aws-apigatewayv2": "2.41.0",
			"@aws-cdk/aws-apigatewayv2-authorizers": "2.41.0",
			"@aws-cdk/aws-apigatewayv2-integrations": "2.41.0",
			"@aws-cdk/aws-appconfig": "2.41.0",
			"@aws-cdk/aws-appflow": "2.41.0",
			"@aws-cdk/aws-appintegrations": "2.41.0",
			"@aws-cdk/aws-applicationautoscaling": "2.41.0",
			"@aws-cdk/aws-applicationinsights": "2.41.0",
			"@aws-cdk/aws-appmesh": "2.41.0",
			"@aws-cdk/aws-apprunner": "2.41.0",
			"@aws-cdk/aws-appstream": "2.41.0",
			"@aws-cdk/aws-appsync": "2.41.0",
			"@aws-cdk/aws-aps": "2.41.0",
			"@aws-cdk/aws-athena": "2.41.0",
			"@aws-cdk/aws-auditmanager": "2.41.0",
			"@aws-cdk/aws-autoscaling": "2.41.0",
			"@aws-cdk/aws-autoscaling-common": "2.41.0",
			"@aws-cdk/aws-autoscaling-hooktargets": "2.41.0",
			"@aws-cdk/aws-autoscalingplans": "2.41.0",
			"@aws-cdk/aws-backup": "2.41.0",
			"@aws-cdk/aws-batch": "2.41.0",
			"@aws-cdk/aws-billingconductor": "2.41.0",
			"@aws-cdk/aws-budgets": "2.41.0",
			"@aws-cdk/aws-cassandra": "2.41.0",
			"@aws-cdk/aws-ce": "2.41.0",
			"@aws-cdk/aws-certificatemanager": "2.41.0",
			"@aws-cdk/aws-chatbot": "2.41.0",
			"@aws-cdk/aws-cloud9": "2.41.0",
			"@aws-cdk/aws-cloudformation": "2.41.0",
			"@aws-cdk/aws-cloudfront": "2.41.0",
			"@aws-cdk/aws-cloudfront-origins": "2.41.0",
			"@aws-cdk/aws-cloudtrail": "2.41.0",
			"@aws-cdk/aws-cloudwatch": "2.41.0",
			"@aws-cdk/aws-cloudwatch-actions": "2.41.0",
			"@aws-cdk/aws-codeartifact": "2.41.0",
			"@aws-cdk/aws-codebuild": "2.41.0",
			"@aws-cdk/aws-codecommit": "2.41.0",
			"@aws-cdk/aws-codedeploy": "2.41.0",
			"@aws-cdk/aws-codeguruprofiler": "2.41.0",
			"@aws-cdk/aws-codegurureviewer": "2.41.0",
			"@aws-cdk/aws-codepipeline": "2.41.0",
			"@aws-cdk/aws-codepipeline-actions": "2.41.0",
			"@aws-cdk/aws-codestar": "2.41.0",
			"@aws-cdk/aws-codestarconnections": "2.41.0",
			"@aws-cdk/aws-codestarnotifications": "2.41.0",
			"@aws-cdk/aws-cognito": "2.41.0",
			"@aws-cdk/aws-cognito-identitypool": "2.41.0",
			"@aws-cdk/aws-config": "2.41.0",
			"@aws-cdk/aws-connect": "2.41.0",
			"@aws-cdk/aws-cur": "2.41.0",
			"@aws-cdk/aws-customerprofiles": "2.41.0",
			"@aws-cdk/aws-databrew": "2.41.0",
			"@aws-cdk/aws-datapipeline": "2.41.0",
			"@aws-cdk/aws-datasync": "2.41.0",
			"@aws-cdk/aws-dax": "2.41.0",
			"@aws-cdk/aws-detective": "2.41.0",
			"@aws-cdk/aws-devopsguru": "2.41.0",
			"@aws-cdk/aws-directoryservice": "2.41.0",
			"@aws-cdk/aws-dlm": "2.41.0",
			"@aws-cdk/aws-dms": "2.41.0",
			"@aws-cdk/aws-docdb": "2.41.0",
			"@aws-cdk/aws-dynamodb": "2.41.0",
			"@aws-cdk/aws-ec2": "2.41.0",
			"@aws-cdk/aws-ecr": "2.41.0",
			"@aws-cdk/aws-ecr-assets": "2.41.0",
			"@aws-cdk/aws-ecs": "2.41.0",
			"@aws-cdk/aws-ecs-patterns": "2.41.0",
			"@aws-cdk/aws-efs": "2.41.0",
			"@aws-cdk/aws-eks": "2.41.0",
			"@aws-cdk/aws-elasticache": "2.41.0",
			"@aws-cdk/aws-elasticbeanstalk": "2.41.0",
			"@aws-cdk/aws-elasticloadbalancing": "2.41.0",
			"@aws-cdk/aws-elasticloadbalancingv2": "2.41.0",
			"@aws-cdk/aws-elasticloadbalancingv2-actions": "2.41.0",
			"@aws-cdk/aws-elasticloadbalancingv2-targets": "2.41.0",
			"@aws-cdk/aws-elasticsearch": "2.41.0",
			"@aws-cdk/aws-emr": "2.41.0",
			"@aws-cdk/aws-emrcontainers": "2.41.0",
			"@aws-cdk/aws-emrserverless": "2.41.0",
			"@aws-cdk/aws-events": "2.41.0",
			"@aws-cdk/aws-events-targets": "2.41.0",
			"@aws-cdk/aws-eventschemas": "2.41.0",
			"@aws-cdk/aws-evidently": "2.41.0",
			"@aws-cdk/aws-finspace": "2.41.0",
			"@aws-cdk/aws-fis": "2.41.0",
			"@aws-cdk/aws-fms": "2.41.0",
			"@aws-cdk/aws-forecast": "2.41.0",
			"@aws-cdk/aws-frauddetector": "2.41.0",
			"@aws-cdk/aws-fsx": "2.41.0",
			"@aws-cdk/aws-gamelift": "2.41.0",
			"@aws-cdk/aws-globalaccelerator": "2.41.0",
			"@aws-cdk/aws-globalaccelerator-endpoints": "2.41.0",
			"@aws-cdk/aws-glue": "2.41.0",
			"@aws-cdk/aws-greengrass": "2.41.0",
			"@aws-cdk/aws-greengrassv2": "2.41.0",
			"@aws-cdk/aws-groundstation": "2.41.0",
			"@aws-cdk/aws-guardduty": "2.41.0",
			"@aws-cdk/aws-healthlake": "2.41.0",
			"@aws-cdk/aws-iam": "2.41.0",
			"@aws-cdk/aws-imagebuilder": "2.41.0",
			"@aws-cdk/aws-inspector": "2.41.0",
			"@aws-cdk/aws-inspectorv2": "2.41.0",
			"@aws-cdk/aws-iot": "2.41.0",
			"@aws-cdk/aws-iot-actions": "2.41.0",
			"@aws-cdk/aws-iot1click": "2.41.0",
			"@aws-cdk/aws-iotanalytics": "2.41.0",
			"@aws-cdk/aws-iotcoredeviceadvisor": "2.41.0",
			"@aws-cdk/aws-iotevents": "2.41.0",
			"@aws-cdk/aws-iotevents-actions": "2.41.0",
			"@aws-cdk/aws-iotfleethub": "2.41.0",
			"@aws-cdk/aws-iotsitewise": "2.41.0",
			"@aws-cdk/aws-iotthingsgraph": "2.41.0",
			"@aws-cdk/aws-iottwinmaker": "2.41.0",
			"@aws-cdk/aws-iotwireless": "2.41.0",
			"@aws-cdk/aws-ivs": "2.41.0",
			"@aws-cdk/aws-kafkaconnect": "2.41.0",
			"@aws-cdk/aws-kendra": "2.41.0",
			"@aws-cdk/aws-kinesis": "2.41.0",
			"@aws-cdk/aws-kinesisanalytics": "2.41.0",
			"@aws-cdk/aws-kinesisanalytics-flink": "2.41.0",
			"@aws-cdk/aws-kinesisanalyticsv2": "2.41.0",
			"@aws-cdk/aws-kinesisfirehose": "2.41.0",
			"@aws-cdk/aws-kinesisfirehose-destinations": "2.41.0",
			"@aws-cdk/aws-kinesisvideo": "2.41.0",
			"@aws-cdk/aws-kms": "2.41.0",
			"@aws-cdk/aws-lakeformation": "2.41.0",
			"@aws-cdk/aws-lambda": "2.41.0",
			"@aws-cdk/aws-lambda-destinations": "2.41.0",
			"@aws-cdk/aws-lambda-event-sources": "2.41.0",
			"@aws-cdk/aws-lambda-go": "2.41.0",
			"@aws-cdk/aws-lambda-nodejs": "2.41.0",
			"@aws-cdk/aws-lambda-python": "2.41.0",
			"@aws-cdk/aws-lex": "2.41.0",
			"@aws-cdk/aws-licensemanager": "2.41.0",
			"@aws-cdk/aws-lightsail": "2.41.0",
			"@aws-cdk/aws-location": "2.41.0",
			"@aws-cdk/aws-logs": "2.41.0",
			"@aws-cdk/aws-logs-destinations": "2.41.0",
			"@aws-cdk/aws-lookoutequipment": "2.41.0",
			"@aws-cdk/aws-lookoutmetrics": "2.41.0",
			"@aws-cdk/aws-lookoutvision": "2.41.0",
			"@aws-cdk/aws-macie": "2.41.0",
			"@aws-cdk/aws-managedblockchain": "2.41.0",
			"@aws-cdk/aws-mediaconnect": "2.41.0",
			"@aws-cdk/aws-mediaconvert": "2.41.0",
			"@aws-cdk/aws-medialive": "2.41.0",
			"@aws-cdk/aws-mediapackage": "2.41.0",
			"@aws-cdk/aws-mediastore": "2.41.0",
			"@aws-cdk/aws-mediatailor": "2.41.0",
			"@aws-cdk/aws-memorydb": "2.41.0",
			"@aws-cdk/aws-msk": "2.41.0",
			"@aws-cdk/aws-mwaa": "2.41.0",
			"@aws-cdk/aws-neptune": "2.41.0",
			"@aws-cdk/aws-networkfirewall": "2.41.0",
			"@aws-cdk/aws-networkmanager": "2.41.0",
			"@aws-cdk/aws-nimblestudio": "2.41.0",
			"@aws-cdk/aws-opensearchservice": "2.41.0",
			"@aws-cdk/aws-opsworks": "2.41.0",
			"@aws-cdk/aws-opsworkscm": "2.41.0",
			"@aws-cdk/aws-panorama": "2.41.0",
			"@aws-cdk/aws-personalize": "2.41.0",
			"@aws-cdk/aws-pinpoint": "2.41.0",
			"@aws-cdk/aws-pinpointemail": "2.41.0",
			"@aws-cdk/aws-qldb": "2.41.0",
			"@aws-cdk/aws-quicksight": "2.41.0",
			"@aws-cdk/aws-ram": "2.41.0",
			"@aws-cdk/aws-rds": "2.41.0",
			"@aws-cdk/aws-redshift": "2.41.0",
			"@aws-cdk/aws-redshiftserverless": "2.41.0",
			"@aws-cdk/aws-refactorspaces": "2.41.0",
			"@aws-cdk/aws-rekognition": "2.41.0",
			"@aws-cdk/aws-resiliencehub": "2.41.0",
			"@aws-cdk/aws-resourcegroups": "2.41.0",
			"@aws-cdk/aws-robomaker": "2.41.0",
			"@aws-cdk/aws-route53": "2.41.0",
			"@aws-cdk/aws-route53-patterns": "2.41.0",
			"@aws-cdk/aws-route53-targets": "2.41.0",
			"@aws-cdk/aws-route53recoverycontrol": "2.41.0",
			"@aws-cdk/aws-route53recoveryreadiness": "2.41.0",
			"@aws-cdk/aws-route53resolver": "2.41.0",
			"@aws-cdk/aws-rum": "2.41.0",
			"@aws-cdk/aws-s3": "2.41.0",
			"@aws-cdk/aws-s3-assets": "2.41.0",
			"@aws-cdk/aws-s3-deployment": "2.41.0",
			"@aws-cdk/aws-s3-notifications": "2.41.0",
			"@aws-cdk/aws-s3objectlambda": "2.41.0",
			"@aws-cdk/aws-s3outposts": "2.41.0",
			"@aws-cdk/aws-sagemaker": "2.41.0",
			"@aws-cdk/aws-sam": "2.41.0",
			"@aws-cdk/aws-sdb": "2.41.0",
			"@aws-cdk/aws-secretsmanager": "2.41.0",
			"@aws-cdk/aws-securityhub": "2.41.0",
			"@aws-cdk/aws-servicecatalog": "2.41.0",
			"@aws-cdk/aws-servicecatalogappregistry": "2.41.0",
			"@aws-cdk/aws-servicediscovery": "2.41.0",
			"@aws-cdk/aws-ses": "2.41.0",
			"@aws-cdk/aws-ses-actions": "2.41.0",
			"@aws-cdk/aws-signer": "2.41.0",
			"@aws-cdk/aws-sns": "2.41.0",
			"@aws-cdk/aws-sns-subscriptions": "2.41.0",
			"@aws-cdk/aws-sqs": "2.41.0",
			"@aws-cdk/aws-ssm": "2.41.0",
			"@aws-cdk/aws-ssmcontacts": "2.41.0",
			"@aws-cdk/aws-ssmincidents": "2.41.0",
			"@aws-cdk/aws-sso": "2.41.0",
			"@aws-cdk/aws-stepfunctions": "2.41.0",
			"@aws-cdk/aws-stepfunctions-tasks": "2.41.0",
			"@aws-cdk/aws-synthetics": "2.41.0",
			"@aws-cdk/aws-timestream": "2.41.0",
			"@aws-cdk/aws-transfer": "2.41.0",
			"@aws-cdk/aws-voiceid": "2.41.0",
			"@aws-cdk/aws-waf": "2.41.0",
			"@aws-cdk/aws-wafregional": "2.41.0",
			"@aws-cdk/aws-wafv2": "2.41.0",
			"@aws-cdk/aws-wisdom": "2.41.0",
			"@aws-cdk/aws-workspaces": "2.41.0",
			"@aws-cdk/aws-xray": "2.41.0",
			"@aws-cdk/cdk-build-tools": "2.41.0",
			"@aws-cdk/cloud-assembly-schema": "2.41.0",
			"@aws-cdk/cloudformation-include": "2.41.0",
			"@aws-cdk/core": "2.41.0",
			"@aws-cdk/custom-resources": "2.41.0",
			"@aws-cdk/cx-api": "2.41.0",
			"@aws-cdk/integ-tests": "2.41.0",
			"@aws-cdk/lambda-layer-awscli": "2.41.0",
			"@aws-cdk/lambda-layer-kubectl": "2.41.0",
			"@aws-cdk/lambda-layer-node-proxy-agent": "2.41.0",
			"@aws-cdk/pipelines": "2.41.0",
			"@aws-cdk/pkglint": "2.41.0",
			"@aws-cdk/region-info": "2.41.0",
			"@aws-cdk/triggers": "2.41.0",
			"@aws-cdk/ubergen": "2.41.0",
			"@types/fs-extra": "^8.1.2",
			"@types/node": "^14.18.27",
			constructs: "^10.0.0",
			esbuild: "^0.15.7",
			"fs-extra": "^9.1.0",
			"ts-node": "^9.1.1",
			typescript: "~3.8.3",
		},
		peerDependencies: { constructs: "^10.0.0" },
		homepage: "https://github.com/aws/aws-cdk",
		engines: { node: ">= 14.15.0" },
		keywords: ["aws", "cdk", "aws cdk v2"],
		nozem: false,
		awscdkio: { announce: false },
		ubergen: { exclude: true, excludeExperimentalModules: true },
		exports: {
			".": "./index.js",
			"./package.json": "./package.json",
			"./.jsii": "./.jsii",
			"./.warnings.jsii.js": "./.warnings.jsii.js",
			"./alexa-ask": "./alexa-ask/index.js",
			"./assertions/lib/helpers-internal":
				"./assertions/lib/helpers-internal/index.js",
			"./assertions": "./assertions/index.js",
			"./assets": "./assets/index.js",
			"./aws-accessanalyzer": "./aws-accessanalyzer/index.js",
			"./aws-acmpca": "./aws-acmpca/index.js",
			"./aws-amazonmq": "./aws-amazonmq/index.js",
			"./aws-amplify": "./aws-amplify/index.js",
			"./aws-amplifyuibuilder": "./aws-amplifyuibuilder/index.js",
			"./aws-apigateway": "./aws-apigateway/index.js",
			"./aws-apigatewayv2": "./aws-apigatewayv2/index.js",
			"./aws-appconfig": "./aws-appconfig/index.js",
			"./aws-appflow": "./aws-appflow/index.js",
			"./aws-appintegrations": "./aws-appintegrations/index.js",
			"./aws-applicationautoscaling": "./aws-applicationautoscaling/index.js",
			"./aws-applicationinsights": "./aws-applicationinsights/index.js",
			"./aws-appmesh": "./aws-appmesh/index.js",
			"./aws-apprunner": "./aws-apprunner/index.js",
			"./aws-appstream": "./aws-appstream/index.js",
			"./aws-appsync": "./aws-appsync/index.js",
			"./aws-aps": "./aws-aps/index.js",
			"./aws-athena": "./aws-athena/index.js",
			"./aws-auditmanager": "./aws-auditmanager/index.js",
			"./aws-autoscaling": "./aws-autoscaling/index.js",
			"./aws-autoscaling-common": "./aws-autoscaling-common/index.js",
			"./aws-autoscaling-hooktargets": "./aws-autoscaling-hooktargets/index.js",
			"./aws-autoscalingplans": "./aws-autoscalingplans/index.js",
			"./aws-backup": "./aws-backup/index.js",
			"./aws-batch": "./aws-batch/index.js",
			"./aws-billingconductor": "./aws-billingconductor/index.js",
			"./aws-budgets": "./aws-budgets/index.js",
			"./aws-cassandra": "./aws-cassandra/index.js",
			"./aws-ce": "./aws-ce/index.js",
			"./aws-certificatemanager": "./aws-certificatemanager/index.js",
			"./aws-chatbot": "./aws-chatbot/index.js",
			"./aws-cloud9": "./aws-cloud9/index.js",
			"./aws-cloudformation": "./aws-cloudformation/index.js",
			"./aws-cloudfront": "./aws-cloudfront/index.js",
			"./aws-cloudfront-origins": "./aws-cloudfront-origins/index.js",
			"./aws-cloudtrail": "./aws-cloudtrail/index.js",
			"./aws-cloudwatch": "./aws-cloudwatch/index.js",
			"./aws-cloudwatch-actions": "./aws-cloudwatch-actions/index.js",
			"./aws-codeartifact": "./aws-codeartifact/index.js",
			"./aws-codebuild": "./aws-codebuild/index.js",
			"./aws-codecommit": "./aws-codecommit/index.js",
			"./aws-codedeploy": "./aws-codedeploy/index.js",
			"./aws-codeguruprofiler": "./aws-codeguruprofiler/index.js",
			"./aws-codegurureviewer": "./aws-codegurureviewer/index.js",
			"./aws-codepipeline": "./aws-codepipeline/index.js",
			"./aws-codepipeline-actions": "./aws-codepipeline-actions/index.js",
			"./aws-codestar": "./aws-codestar/index.js",
			"./aws-codestarconnections": "./aws-codestarconnections/index.js",
			"./aws-codestarnotifications": "./aws-codestarnotifications/index.js",
			"./aws-cognito": "./aws-cognito/index.js",
			"./aws-config": "./aws-config/index.js",
			"./aws-connect": "./aws-connect/index.js",
			"./aws-cur": "./aws-cur/index.js",
			"./aws-customerprofiles": "./aws-customerprofiles/index.js",
			"./aws-databrew": "./aws-databrew/index.js",
			"./aws-datapipeline": "./aws-datapipeline/index.js",
			"./aws-datasync": "./aws-datasync/index.js",
			"./aws-dax": "./aws-dax/index.js",
			"./aws-detective": "./aws-detective/index.js",
			"./aws-devopsguru": "./aws-devopsguru/index.js",
			"./aws-directoryservice": "./aws-directoryservice/index.js",
			"./aws-dlm": "./aws-dlm/index.js",
			"./aws-dms": "./aws-dms/index.js",
			"./aws-docdb": "./aws-docdb/index.js",
			"./aws-dynamodb": "./aws-dynamodb/index.js",
			"./aws-ec2": "./aws-ec2/index.js",
			"./aws-ecr": "./aws-ecr/index.js",
			"./aws-ecr-assets": "./aws-ecr-assets/index.js",
			"./aws-ecs": "./aws-ecs/index.js",
			"./aws-ecs-patterns": "./aws-ecs-patterns/index.js",
			"./aws-efs": "./aws-efs/index.js",
			"./aws-eks": "./aws-eks/index.js",
			"./aws-elasticache": "./aws-elasticache/index.js",
			"./aws-elasticbeanstalk": "./aws-elasticbeanstalk/index.js",
			"./aws-elasticloadbalancing": "./aws-elasticloadbalancing/index.js",
			"./aws-elasticloadbalancingv2": "./aws-elasticloadbalancingv2/index.js",
			"./aws-elasticloadbalancingv2-actions":
				"./aws-elasticloadbalancingv2-actions/index.js",
			"./aws-elasticloadbalancingv2-targets":
				"./aws-elasticloadbalancingv2-targets/index.js",
			"./aws-elasticsearch": "./aws-elasticsearch/index.js",
			"./aws-emr": "./aws-emr/index.js",
			"./aws-emrcontainers": "./aws-emrcontainers/index.js",
			"./aws-emrserverless": "./aws-emrserverless/index.js",
			"./aws-events": "./aws-events/index.js",
			"./aws-events-targets": "./aws-events-targets/index.js",
			"./aws-eventschemas": "./aws-eventschemas/index.js",
			"./aws-evidently": "./aws-evidently/index.js",
			"./aws-finspace": "./aws-finspace/index.js",
			"./aws-fis": "./aws-fis/index.js",
			"./aws-fms": "./aws-fms/index.js",
			"./aws-forecast": "./aws-forecast/index.js",
			"./aws-frauddetector": "./aws-frauddetector/index.js",
			"./aws-fsx": "./aws-fsx/index.js",
			"./aws-gamelift": "./aws-gamelift/index.js",
			"./aws-globalaccelerator": "./aws-globalaccelerator/index.js",
			"./aws-globalaccelerator-endpoints":
				"./aws-globalaccelerator-endpoints/index.js",
			"./aws-glue": "./aws-glue/index.js",
			"./aws-greengrass": "./aws-greengrass/index.js",
			"./aws-greengrassv2": "./aws-greengrassv2/index.js",
			"./aws-groundstation": "./aws-groundstation/index.js",
			"./aws-guardduty": "./aws-guardduty/index.js",
			"./aws-healthlake": "./aws-healthlake/index.js",
			"./aws-iam": "./aws-iam/index.js",
			"./aws-imagebuilder": "./aws-imagebuilder/index.js",
			"./aws-inspector": "./aws-inspector/index.js",
			"./aws-inspectorv2": "./aws-inspectorv2/index.js",
			"./aws-iot": "./aws-iot/index.js",
			"./aws-iot1click": "./aws-iot1click/index.js",
			"./aws-iotanalytics": "./aws-iotanalytics/index.js",
			"./aws-iotcoredeviceadvisor": "./aws-iotcoredeviceadvisor/index.js",
			"./aws-iotevents": "./aws-iotevents/index.js",
			"./aws-iotfleethub": "./aws-iotfleethub/index.js",
			"./aws-iotsitewise": "./aws-iotsitewise/index.js",
			"./aws-iotthingsgraph": "./aws-iotthingsgraph/index.js",
			"./aws-iottwinmaker": "./aws-iottwinmaker/index.js",
			"./aws-iotwireless": "./aws-iotwireless/index.js",
			"./aws-ivs": "./aws-ivs/index.js",
			"./aws-kafkaconnect": "./aws-kafkaconnect/index.js",
			"./aws-kendra": "./aws-kendra/index.js",
			"./aws-kinesis": "./aws-kinesis/index.js",
			"./aws-kinesisanalytics": "./aws-kinesisanalytics/index.js",
			"./aws-kinesisanalyticsv2": "./aws-kinesisanalyticsv2/index.js",
			"./aws-kinesisfirehose": "./aws-kinesisfirehose/index.js",
			"./aws-kinesisvideo": "./aws-kinesisvideo/index.js",
			"./aws-kms": "./aws-kms/index.js",
			"./aws-lakeformation": "./aws-lakeformation/index.js",
			"./aws-lambda": "./aws-lambda/index.js",
			"./aws-lambda-destinations": "./aws-lambda-destinations/index.js",
			"./aws-lambda-event-sources": "./aws-lambda-event-sources/index.js",
			"./aws-lambda-nodejs": "./aws-lambda-nodejs/index.js",
			"./aws-lex": "./aws-lex/index.js",
			"./aws-licensemanager": "./aws-licensemanager/index.js",
			"./aws-lightsail": "./aws-lightsail/index.js",
			"./aws-location": "./aws-location/index.js",
			"./aws-logs": "./aws-logs/index.js",
			"./aws-logs-destinations": "./aws-logs-destinations/index.js",
			"./aws-lookoutequipment": "./aws-lookoutequipment/index.js",
			"./aws-lookoutmetrics": "./aws-lookoutmetrics/index.js",
			"./aws-lookoutvision": "./aws-lookoutvision/index.js",
			"./aws-macie": "./aws-macie/index.js",
			"./aws-managedblockchain": "./aws-managedblockchain/index.js",
			"./aws-mediaconnect": "./aws-mediaconnect/index.js",
			"./aws-mediaconvert": "./aws-mediaconvert/index.js",
			"./aws-medialive": "./aws-medialive/index.js",
			"./aws-mediapackage": "./aws-mediapackage/index.js",
			"./aws-mediastore": "./aws-mediastore/index.js",
			"./aws-mediatailor": "./aws-mediatailor/index.js",
			"./aws-memorydb": "./aws-memorydb/index.js",
			"./aws-msk": "./aws-msk/index.js",
			"./aws-mwaa": "./aws-mwaa/index.js",
			"./aws-neptune": "./aws-neptune/index.js",
			"./aws-networkfirewall": "./aws-networkfirewall/index.js",
			"./aws-networkmanager": "./aws-networkmanager/index.js",
			"./aws-nimblestudio": "./aws-nimblestudio/index.js",
			"./aws-opensearchservice": "./aws-opensearchservice/index.js",
			"./aws-opsworks": "./aws-opsworks/index.js",
			"./aws-opsworkscm": "./aws-opsworkscm/index.js",
			"./aws-panorama": "./aws-panorama/index.js",
			"./aws-personalize": "./aws-personalize/index.js",
			"./aws-pinpoint": "./aws-pinpoint/index.js",
			"./aws-pinpointemail": "./aws-pinpointemail/index.js",
			"./aws-qldb": "./aws-qldb/index.js",
			"./aws-quicksight": "./aws-quicksight/index.js",
			"./aws-ram": "./aws-ram/index.js",
			"./aws-rds": "./aws-rds/index.js",
			"./aws-redshift": "./aws-redshift/index.js",
			"./aws-redshiftserverless": "./aws-redshiftserverless/index.js",
			"./aws-refactorspaces": "./aws-refactorspaces/index.js",
			"./aws-rekognition": "./aws-rekognition/index.js",
			"./aws-resiliencehub": "./aws-resiliencehub/index.js",
			"./aws-resourcegroups": "./aws-resourcegroups/index.js",
			"./aws-robomaker": "./aws-robomaker/index.js",
			"./aws-route53": "./aws-route53/index.js",
			"./aws-route53-patterns": "./aws-route53-patterns/index.js",
			"./aws-route53-targets": "./aws-route53-targets/index.js",
			"./aws-route53recoverycontrol": "./aws-route53recoverycontrol/index.js",
			"./aws-route53recoveryreadiness": "./aws-route53recoveryreadiness/index.js",
			"./aws-route53resolver": "./aws-route53resolver/index.js",
			"./aws-rum": "./aws-rum/index.js",
			"./aws-s3": "./aws-s3/index.js",
			"./aws-s3-assets": "./aws-s3-assets/index.js",
			"./aws-s3-deployment": "./aws-s3-deployment/index.js",
			"./aws-s3-notifications": "./aws-s3-notifications/index.js",
			"./aws-s3objectlambda": "./aws-s3objectlambda/index.js",
			"./aws-s3outposts": "./aws-s3outposts/index.js",
			"./aws-sagemaker": "./aws-sagemaker/index.js",
			"./aws-sam": "./aws-sam/index.js",
			"./aws-sdb": "./aws-sdb/index.js",
			"./aws-secretsmanager": "./aws-secretsmanager/index.js",
			"./aws-securityhub": "./aws-securityhub/index.js",
			"./aws-servicecatalog": "./aws-servicecatalog/index.js",
			"./aws-servicecatalogappregistry":
				"./aws-servicecatalogappregistry/index.js",
			"./aws-servicediscovery": "./aws-servicediscovery/index.js",
			"./aws-ses": "./aws-ses/index.js",
			"./aws-ses-actions": "./aws-ses-actions/index.js",
			"./aws-signer": "./aws-signer/index.js",
			"./aws-sns": "./aws-sns/index.js",
			"./aws-sns-subscriptions": "./aws-sns-subscriptions/index.js",
			"./aws-sqs": "./aws-sqs/index.js",
			"./aws-ssm": "./aws-ssm/index.js",
			"./aws-ssmcontacts": "./aws-ssmcontacts/index.js",
			"./aws-ssmincidents": "./aws-ssmincidents/index.js",
			"./aws-sso": "./aws-sso/index.js",
			"./aws-stepfunctions": "./aws-stepfunctions/index.js",
			"./aws-stepfunctions-tasks": "./aws-stepfunctions-tasks/index.js",
			"./aws-synthetics": "./aws-synthetics/index.js",
			"./aws-timestream": "./aws-timestream/index.js",
			"./aws-transfer": "./aws-transfer/index.js",
			"./aws-voiceid": "./aws-voiceid/index.js",
			"./aws-waf": "./aws-waf/index.js",
			"./aws-wafregional": "./aws-wafregional/index.js",
			"./aws-wafv2": "./aws-wafv2/index.js",
			"./aws-wisdom": "./aws-wisdom/index.js",
			"./aws-workspaces": "./aws-workspaces/index.js",
			"./aws-xray": "./aws-xray/index.js",
			"./cloud-assembly-schema": "./cloud-assembly-schema/index.js",
			"./cloudformation-include": "./cloudformation-include/index.js",
			"./core/lib/helpers-internal": "./core/lib/helpers-internal/index.js",
			"./custom-resources": "./custom-resources/index.js",
			"./cx-api": "./cx-api/index.js",
			"./lambda-layer-awscli": "./lambda-layer-awscli/index.js",
			"./lambda-layer-kubectl": "./lambda-layer-kubectl/index.js",
			"./lambda-layer-node-proxy-agent":
				"./lambda-layer-node-proxy-agent/index.js",
			"./pipelines": "./pipelines/index.js",
			"./pipelines/package.json": "./pipelines/package.json",
			"./pipelines/.jsii": "./pipelines/.jsii",
			"./pipelines/.warnings.jsii.js": "./pipelines/.warnings.jsii.js",
			"./pipelines/lib/helpers-internal":
				"./pipelines/lib/helpers-internal/index.js",
			"./region-info": "./region-info/index.js",
			"./triggers": "./triggers/index.js",
		},
		preferredCdkCliVersion: "2",
		publishConfig: { tag: "latest" },
	};


	pass(pkg, "./.warnings.jsii.js", ".warnings.jsii.js");
});

resolve.run();

// ---

const requires = suite('options.requires', {
	"exports": {
		"require": "$require",
		"import": "$import",
	}
});

requires('should ignore "require" keys by default', pkg => {
	pass(pkg, '$import');
});

requires('should use "require" key when defined first', pkg => {
	pass(pkg, '$require', '.', { require: true });
});

requires('should ignore "import" key when enabled', () => {
	let pkg = {
		"exports": {
			"import": "$import",
			"require": "$require",
		}
	};
	pass(pkg, '$require', '.', { require: true });
	pass(pkg, '$import', '.');
});

requires('should match "default" if "require" is after', () => {
	let pkg = {
		"exports": {
			"default": "$default",
			"require": "$require",
		}
	};
	pass(pkg, '$default', '.', { require: true });
});

requires.run();

// ---

const browser = suite('options.browser', {
	"exports": {
		"browser": "$browser",
		"node": "$node",
	}
});

browser('should ignore "browser" keys by default', pkg => {
	pass(pkg, '$node');
});

browser('should use "browser" key when defined first', pkg => {
	pass(pkg, '$browser', '.', { browser: true });
});

browser('should ignore "node" key when enabled', () => {
	let pkg = {
		"exports": {
			"node": "$node",
			"import": "$import",
			"browser": "$browser",
		}
	};
	// import defined before browser
	pass(pkg, '$import', '.', { browser: true });
});

browser.run();

// ---

const conditions = suite('options.conditions', {
	"exports": {
		"production": "$prod",
		"development": "$dev",
		"default": "$default",
	}
});

conditions('should ignore unknown conditions by default', pkg => {
	pass(pkg, '$default');
});

conditions('should recognize custom field(s) when specified', pkg => {
	pass(pkg, '$dev', '.', {
		conditions: ['development']
	});

	pass(pkg, '$prod', '.', {
		conditions: ['development', 'production']
	});
});

conditions('should throw an error if no known conditions', ctx => {
	let pkg = {
		"name": "hello",
		"exports": {
			...ctx.exports
		},
	};

	delete pkg.exports.default;

	try {
		$exports.resolve(pkg);
		assert.unreachable();
	} catch (err) {
		assert.instance(err, Error);
		assert.is(err.message, `No known conditions for "." entry in "hello" package`);
	}
});

conditions.run();

// ---

const unsafe = suite('options.unsafe', {
	"exports": {
		".": {
			"production": "$prod",
			"development": "$dev",
			"default": "$default",
		},
		"./spec/type": {
			"import": "$import",
			"require": "$require",
			"default": "$default"
		},
		"./spec/env": {
			"worker": {
				"default": "$worker"
			},
			"browser": "$browser",
			"node": "$node",
			"default": "$default"
		}
	}
});

unsafe('should ignore unknown conditions by default', pkg => {
	pass(pkg, '$default', '.', {
		unsafe: true,
	});
});

unsafe('should ignore "import" and "require" conditions by default', pkg => {
	pass(pkg, '$default', './spec/type', {
		unsafe: true,
	});

	pass(pkg, '$default', './spec/type', {
		unsafe: true,
		require: true,
	});
});

unsafe('should ignore "node" and "browser" conditions by default', pkg => {
	pass(pkg, '$default', './spec/type', {
		unsafe: true,
	});

	pass(pkg, '$default', './spec/type', {
		unsafe: true,
		browser: true,
	});
});

unsafe('should respect/accept any custom condition(s) when specified', pkg => {
	// root, dev only
	pass(pkg, '$dev', '.', {
		unsafe: true,
		conditions: ['development']
	});

	// root, defined order
	pass(pkg, '$prod', '.', {
		unsafe: true,
		conditions: ['development', 'production']
	});

	// import vs require, defined order
	pass(pkg, '$require', './spec/type', {
		unsafe: true,
		conditions: ['require']
	});

	// import vs require, defined order
	pass(pkg, '$import', './spec/type', {
		unsafe: true,
		conditions: ['import', 'require']
	});

	// import vs require, defined order
	pass(pkg, '$node', './spec/env', {
		unsafe: true,
		conditions: ['node']
	});

	// import vs require, defined order
	pass(pkg, '$browser', './spec/env', {
		unsafe: true,
		conditions: ['browser', 'node']
	});

	// import vs require, defined order
	pass(pkg, '$worker', './spec/env', {
		unsafe: true,
		conditions: ['browser', 'node', 'worker']
	});
});

unsafe.run();
