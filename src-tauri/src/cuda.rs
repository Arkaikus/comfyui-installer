pub fn torch_index_url(major: u32, minor: u32, cpu: bool) -> &'static str {
    if cpu {
        return "https://download.pytorch.org/whl/cpu";
    }
    if major >= 13 {
        "https://download.pytorch.org/whl/cu130"
    } else if major > 12 || (major == 12 && minor >= 8) {
        "https://download.pytorch.org/whl/cu128"
    } else if major == 12 && minor >= 6 {
        "https://download.pytorch.org/whl/cu126"
    } else if major == 12 && minor >= 4 {
        "https://download.pytorch.org/whl/cu124"
    } else {
        "https://download.pytorch.org/whl/cu121"
    }
}

pub fn parse_cuda_version(nvidia_smi: &str) -> Option<(u32, u32)> {
    for marker in ["CUDA UMD Version:", "CUDA Version:"] {
        if let Some(rest) = nvidia_smi.split(marker).nth(1) {
            let token = rest.split_whitespace().next()?;
            let mut parts = token.split('.');
            let major = parts.next()?.parse().ok()?;
            let minor = parts.next().unwrap_or("0").parse().unwrap_or(0);
            return Some((major, minor));
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cpu_index() {
        assert_eq!(
            torch_index_url(12, 8, true),
            "https://download.pytorch.org/whl/cpu"
        );
    }

    #[test]
    fn cuda_buckets() {
        assert!(torch_index_url(12, 1, false).contains("cu121"));
        assert!(torch_index_url(12, 4, false).contains("cu124"));
        assert!(torch_index_url(12, 6, false).contains("cu126"));
        assert!(torch_index_url(12, 8, false).contains("cu128"));
        assert!(torch_index_url(13, 3, false).contains("cu130"));
    }

    #[test]
    fn parse_smi() {
        let sample = "NVIDIA-SMI 560.35.03    Driver Version: 560.35.03    CUDA Version: 12.6";
        assert_eq!(parse_cuda_version(sample), Some((12, 6)));
    }

    #[test]
    fn parse_smi_umd() {
        let sample = "NVIDIA-SMI 610.57.04    KMD Version: 610.57.04     CUDA UMD Version: 13.3";
        assert_eq!(parse_cuda_version(sample), Some((13, 3)));
    }
}
