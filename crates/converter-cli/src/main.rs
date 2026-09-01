use anyhow::{Context, Result};
use clap::{Args, Parser, Subcommand, ValueEnum};
use recast_core::execution::build_plan;
use recast_core::formats::built_in_formats;
use recast_core::inspection::inspect_path;
use recast_core::presets::load_presets;
use recast_engines::EngineSet;
use recast_models::{ConversionRequest, OverwritePolicy};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

#[derive(Parser)]
#[command(name = "recast")]
#[command(about = "Offline-first media converter CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Inspect {
        input: PathBuf,
    },
    Convert(ConvertArgs),
    Formats {
        #[arg(long)]
        json: bool,
    },
    Presets {
        #[arg(long)]
        json: bool,
    },
    Integration {
        #[command(subcommand)]
        platform: IntegrationCommand,
    },
}

#[derive(Subcommand)]
enum IntegrationCommand {
    Windows { action: IntegrationAction },
}

#[derive(ValueEnum, Clone)]
enum IntegrationAction {
    Install,
    Remove,
}

#[derive(Args)]
struct ConvertArgs {
    inputs: Vec<PathBuf>,
    #[arg(long = "to")]
    target_format: String,
    #[arg(long)]
    preset: Option<String>,
    #[arg(long)]
    output: Option<PathBuf>,
    #[arg(long, value_enum, default_value_t = CliOverwritePolicy::Rename)]
    overwrite_policy: CliOverwritePolicy,
    #[arg(long)]
    json: bool,
}

#[derive(ValueEnum, Clone)]
enum CliOverwritePolicy {
    Rename,
    Overwrite,
    Skip,
    Ask,
}

impl From<CliOverwritePolicy> for OverwritePolicy {
    fn from(value: CliOverwritePolicy) -> Self {
        match value {
            CliOverwritePolicy::Rename => Self::Rename,
            CliOverwritePolicy::Overwrite => Self::Overwrite,
            CliOverwritePolicy::Skip => Self::Skip,
            CliOverwritePolicy::Ask => Self::Ask,
        }
    }
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Inspect { input } => {
            let info = inspect_path(&input)?;
            println!("{}", serde_json::to_string_pretty(&info)?);
        }
        Commands::Convert(args) => {
            let engines = EngineSet::discover(Path::new("binaries/windows"))
                .context("unable to discover conversion engines")?;
            let request = ConversionRequest {
                input_paths: args.inputs,
                target_format: args.target_format,
                preset_id: args.preset,
                output_directory: args.output,
                overwrite_policy: args.overwrite_policy.into(),
                options: BTreeMap::new(),
            };
            let plan = build_plan(&request, &engines)?;
            if args.json {
                println!("{}", serde_json::to_string_pretty(&plan)?);
            } else {
                for item in plan {
                    println!(
                        "{} -> {} via {}",
                        item.temp_output.display(),
                        item.final_output.display(),
                        item.executable.display()
                    );
                }
            }
        }
        Commands::Formats { json } => {
            let formats = built_in_formats();
            if json {
                println!("{}", serde_json::to_string_pretty(&formats)?);
            } else {
                for format in formats {
                    let codecs = [
                        format.default_video_codec.as_deref(),
                        format.default_audio_codec.as_deref(),
                    ]
                    .into_iter()
                    .flatten()
                    .collect::<Vec<_>>()
                    .join(" + ");
                    println!(
                        "{} ({:?}) [{}]",
                        format.display_name, format.category, codecs
                    );
                }
            }
        }
        Commands::Presets { json } => {
            let mut presets = Vec::new();
            for file in [
                "presets/image.json",
                "presets/video.json",
                "presets/audio.json",
            ] {
                presets.extend(load_presets(Path::new(file))?);
            }
            if json {
                println!("{}", serde_json::to_string_pretty(&presets)?);
            } else {
                for preset in presets {
                    println!("{} -> {}", preset.id, preset.target_format);
                }
            }
        }
        Commands::Integration { platform } => match platform {
            IntegrationCommand::Windows { action } => match action {
                IntegrationAction::Install => {
                    shell_integration::install_windows_context_menu(&std::env::current_exe()?)?
                }
                IntegrationAction::Remove => shell_integration::remove_windows_context_menu()?,
            },
        },
    }

    Ok(())
}
