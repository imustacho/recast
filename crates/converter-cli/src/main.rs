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
    #[arg(long)]
    execute: bool,
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

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Inspect { input } => {
            let info = inspect_path(&input)?;
            println!("{}", serde_json::to_string_pretty(&info)?);
        }
        Commands::Convert(args) => {
            let engine_dir = if cfg!(windows) {
                Path::new("binaries/windows")
            } else if cfg!(target_os = "macos") {
                Path::new("binaries/macos")
            } else {
                Path::new("binaries/linux")
            };
            let engines =
                EngineSet::discover(engine_dir).context("unable to discover conversion engines")?;
            let request = ConversionRequest {
                input_paths: args.inputs.clone(),
                target_format: args.target_format.clone(),
                preset_id: args.preset,
                output_directory: args.output,
                overwrite_policy: args.overwrite_policy.into(),
                options: BTreeMap::new(),
            };
            let plan = build_plan(&request, &engines)?;
            if args.json {
                println!("{}", serde_json::to_string_pretty(&plan)?);
            } else if args.execute {
                for item in &plan {
                    println!(
                        "Converting {} -> {} via {}",
                        item.temp_output.display(),
                        item.final_output.display(),
                        item.executable.display()
                    );
                    if item.category == recast_models::MediaCategory::Document {
                        let input = args
                            .inputs
                            .iter()
                            .find(|p| {
                                let stem = p.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                                item.final_output.to_string_lossy().contains(stem)
                            })
                            .unwrap_or(&args.inputs[0]);
                        let source_format =
                            input.extension().and_then(|e| e.to_str()).unwrap_or("");
                        recast_core::execution::execute_document_conversion(
                            &item.executable,
                            input,
                            &item.final_output,
                            source_format,
                            &args.target_format,
                        )
                        .await?;
                        println!("Completed: {}", item.final_output.display());
                    } else {
                        let mut cmd = std::process::Command::new(&item.executable);
                        cmd.args(&item.args);
                        let output = cmd.output()?;
                        if !output.status.success() {
                            let err = String::from_utf8_lossy(&output.stderr);
                            anyhow::bail!("FFmpeg conversion failed: {err}");
                        }
                        println!("Completed: {}", item.final_output.display());
                    }
                }
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
                "presets/document.json",
            ] {
                let path = Path::new(file);
                if path.exists() {
                    presets.extend(load_presets(path)?);
                }
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
